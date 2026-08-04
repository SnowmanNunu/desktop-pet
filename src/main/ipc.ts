import { ipcMain } from 'electron'
import type { PetConfig, Reminder } from '../shared/types'
import { IPC } from '../shared/ipc-channels'
import { getConfig, updateConfig } from './config-store'
import type { ReminderStore } from './reminders/store'
import {
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
      const id = reminder.id ?? `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

  // 任务变化时同步给面板（面板可能打开着）
  reminderStore.onChange((reminders) => {
    getPanelWindow()?.webContents.send(IPC.remindersChanged, reminders)
  })
}
