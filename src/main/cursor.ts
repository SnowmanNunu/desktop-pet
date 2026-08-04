import { screen } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getPetWindow } from './windows'

let cursorPollInterval: NodeJS.Timeout | null = null

/**
 * 主进程轮询全局光标（宠物窗口内拿不到全局坐标），30ms 一次转发给宠物窗口。
 * 始终轮询（不论是否开启跟随）：附带光标所在显示器的工作区，
 * 供闲逛/边界钳制做多显示器适配。
 */
export function startCursorPoll (): void {
  if (cursorPollInterval) return
  cursorPollInterval = setInterval(() => {
    const win = getPetWindow()
    if (!win) return
    try {
      const point = screen.getCursorScreenPoint()
      const display = screen.getDisplayNearestPoint(point)
      win.webContents.send(IPC.cursorPosition, {
        x: point.x,
        y: point.y,
        bounds: display.workArea
      })
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
