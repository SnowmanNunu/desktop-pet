import { app, ipcMain, Menu, shell } from 'electron'
import type { PetConfig, Reminder } from '../shared/types'
import { IPC } from '../shared/ipc-channels'
import { getConfig, updateConfig } from './config-store'
import type { ReminderStore } from './reminders/store'
import { checkForUpdates } from './updates'
import {
  applyClickThrough,
  applyPetScale,
  createPanelWindow,
  createPetWindow,
  getPanelWindow,
  getPetWindow,
  hidePetWindow,
  showPetWindow
} from './windows'

/** 注册面板与宠物窗口的全部 IPC 通道 */
export function registerIpc (reminderStore: ReminderStore): void {
  // ---- 配置 ----
  ipcMain.handle(IPC.getPetConfig, () => getConfig())

  ipcMain.handle(IPC.updatePetConfig, (_event, patch: Partial<PetConfig>) => {
    const config = updateConfig(patch)

    // 需要主进程即时生效的副作用
    if (patch.petScale !== undefined) applyPetScale(config.petScale)
    if (patch.clickThrough !== undefined) applyClickThrough(config.clickThrough)
    if (patch.autoStart !== undefined) applyAutoStart(config.autoStart)

    getPetWindow()?.webContents.send(IPC.petConfig, config)
    return config
  })

  // ---- 宠物窗口控制 ----
  ipcMain.handle(IPC.isPetRunning, () => getPetWindow() !== null)

  ipcMain.handle(IPC.showPet, () => {
    if (!getPetWindow()) {
      createPetWindow()
    } else {
      showPetWindow()
    }
  })

  ipcMain.handle(IPC.hidePet, () => {
    hidePetWindow()
  })

  ipcMain.handle(IPC.restartPet, () => {
    getPetWindow()?.close()
    createPetWindow()
  })

  // ---- 提醒任务 CRUD ----
  ipcMain.handle(IPC.listReminders, () => reminderStore.list())

  ipcMain.handle(
    IPC.addReminder,
    (_event, reminder: Omit<Reminder, 'id'> & { id?: string }) => {
      const id = reminder.id ?? newReminderId()
      // interval 类型以创建时间为锚点，首次触发在创建 N 分钟后
      const anchored =
        reminder.type === 'interval' && !reminder.lastFiredAt
          ? { ...reminder, lastFiredAt: new Date().toISOString() }
          : reminder
      return reminderStore.add({ ...anchored, id })
    }
  )

  ipcMain.handle(
    IPC.updateReminder,
    (_event, id: string, patch: Partial<Reminder>) => reminderStore.update(id, patch)
  )

  ipcMain.handle(IPC.deleteReminder, (_event, id: string) => reminderStore.remove(id))

  ipcMain.handle(IPC.importLegacyTasks, (_event, reminders: Reminder[]) => {
    let list = reminderStore.list()
    for (const reminder of reminders) {
      list = reminderStore.add(reminder)
    }
    return list
  })

  // ---- 稍后提醒（snooze）：生成一条 transient 一次性任务 ----
  ipcMain.handle(IPC.snoozeReminder, (_event, title: string, minutes = 10) => {
    const datetime = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    return reminderStore.add({
      id: newReminderId(),
      title,
      type: 'once',
      datetime,
      enabled: true,
      lastFiredAt: null,
      transient: true
    })
  })

  // ---- 检查更新 / 打开链接 ----
  ipcMain.handle(IPC.checkUpdates, () => checkForUpdates())

  ipcMain.handle(IPC.openExternal, (_event, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })

  // ---- 宠物右键菜单 ----
  ipcMain.on(IPC.petContextMenu, () => {
    const pet = getPetWindow()
    if (!pet) return
    const sendCommand = (cmd: 'sit' | 'sleep'): void => {
      pet.webContents.send(IPC.petCommand, cmd)
    }
    Menu.buildFromTemplate([
      { label: '坐一下', click: () => sendCommand('sit') },
      { label: '去睡觉', click: () => sendCommand('sleep') },
      { type: 'separator' },
      { label: '隐藏宠物', click: () => hidePetWindow() },
      { label: '打开控制面板', click: () => createPanelWindow() },
      { type: 'separator' },
      { label: '退出', click: () => app.exit(0) }
    ]).popup({ window: pet })
  })

  // 任务变化时同步给面板（面板可能打开着）
  reminderStore.onChange((reminders) => {
    getPanelWindow()?.webContents.send(IPC.remindersChanged, reminders)
  })
}

/** 应用开机自启设置（macOS / Windows 生效；dev 模式无权限，直接跳过） */
export function applyAutoStart (enabled: boolean): void {
  if (!app.isPackaged) return
  try {
    app.setLoginItemSettings({ openAtLogin: enabled })
  } catch (err) {
    console.error('[autostart] 设置失败', err)
  }
}

function newReminderId (): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
