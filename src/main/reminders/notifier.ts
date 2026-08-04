import { Notification, shell } from 'electron'
import type { Reminder } from '../../shared/types'
import { IPC } from '../../shared/ipc-channels'
import { getConfig } from '../config-store'
import { getPetWindow, showPetWindow } from '../windows'

/**
 * 提醒触发：
 * 1. 系统提示音（shell.beep，最可靠的兜底）
 * 2. 确保宠物窗口可见
 * 3. 通知宠物窗口播放 remind 动画 + 气泡（窗口内还有 WebAudio 提示音）
 * 4. 系统通知兜底（宠物窗口被关闭时仍能收到）
 */
export function fireReminder (reminder: Reminder): void {
  console.log('[reminders] fired:', reminder.title)

  if (getConfig().reminderSound) {
    shell.beep()
  }

  const pet = getPetWindow()
  if (pet) {
    showPetWindow()
    pet.webContents.send(IPC.reminderFired, {
      title: reminder.title,
      sticky: reminder.sticky === true
    })
  }

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🐺 哈士奇提醒',
      body: reminder.title,
      silent: false
    })
    notification.show()
  }
}
