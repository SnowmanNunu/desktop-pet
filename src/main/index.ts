import { app, globalShortcut } from 'electron'
import { loadConfig } from './config-store'
import { startCursorPoll, stopCursorPoll } from './cursor'
import { registerDragHandlers } from './drag'
import { registerIpc } from './ipc'
import { fireReminder } from './reminders/notifier'
import { ReminderScheduler } from './reminders/scheduler'
import { ReminderStore } from './reminders/store'
import { createTray } from './tray'
import { createPanelWindow, createPetWindow, togglePanelWindow } from './windows'

// 单实例锁：重复启动时聚焦已有实例
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.exit(0)
}

const reminderStore = new ReminderStore()
const scheduler = new ReminderScheduler(reminderStore, fireReminder)

app.whenReady().then(() => {
  loadConfig()

  registerIpc(reminderStore)
  registerDragHandlers()

  // 宠物是主角：启动即创建（可见性由 showOnStartup 决定）
  createPetWindow()
  createTray()
  createPanelWindow()
  startCursorPoll()

  // 提醒调度：主进程常驻，面板关闭/重启后仍能触发
  scheduler.start()

  // 全局快捷键 Ctrl/Cmd+Shift+S：显示/隐藏控制面板
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    togglePanelWindow()
  })

  app.on('activate', () => {
    createPanelWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopCursorPoll()
  scheduler.stop()
})

// 所有窗口关闭时不退出 —— 宠物和提醒引擎需要常驻；退出走托盘菜单
app.on('window-all-closed', () => {
  // no-op
})
