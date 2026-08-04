import { Notification } from 'electron'
import type { Reminder } from '../../shared/types'
import { IPC } from '../../shared/ipc-channels'
import { getPetWindow, showPetWindow } from '../windows'

/**
 * 提醒触发：
 * 1. 确保宠物窗口可见
 * 2. 通知宠物窗口播放 remind 动画 + 气泡
 * 3. 系统通知兜底（宠物窗口被关闭时仍能收到）
 */
export function fireReminder (reminder: Reminder): void {
  console.log('[reminders] fired:', reminder.title)

  const pet = getPetWindow()
  if (pet) {
    showPetWindow()
    pet.webContents.send(IPC.reminderFired, {
      title: reminder.title
    })
  }

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🐺 旺财提醒',
      body: reminder.title,
      silent: false
    })
    notification.show()
  }
}
