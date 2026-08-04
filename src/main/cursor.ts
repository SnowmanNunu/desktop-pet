import { screen } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getConfig } from './config-store'
import { getPetWindow } from './windows'

let cursorPollInterval: NodeJS.Timeout | null = null

/** 主进程轮询全局光标（宠物窗口内拿不到全局坐标），30ms 一次转发给宠物窗口 */
export function startCursorPoll (): void {
  if (cursorPollInterval) return
  cursorPollInterval = setInterval(() => {
    if (!getConfig().followMouse) return
    const win = getPetWindow()
    if (!win) return
    try {
      const cursor = screen.getCursorScreenPoint()
      win.webContents.send(IPC.cursorPosition, { x: cursor.x, y: cursor.y })
    } catch {
      // 窗口销毁竞态，忽略
    }
  }, 30)
}

export function stopCursorPoll (): void {
  if (cursorPollInterval) {
    clearInterval(cursorPollInterval)
    cursorPollInterval = null
  }
}
