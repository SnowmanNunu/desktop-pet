import { ipcMain, screen } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { getPetWindow } from './windows'

let dragInterval: NodeJS.Timeout | null = null

interface DragOffset {
  offsetX: number
  offsetY: number
}

/** 注册宠物窗口拖拽：渲染进程按下并移动后发 start-pet-drag，主进程轮询光标移窗 */
export function registerDragHandlers (): void {
  ipcMain.on(IPC.movePetWindow, (_event, pos: { x: number; y: number }) => {
    const win = getPetWindow()
    if (win && pos) {
      win.setPosition(Math.round(pos.x), Math.round(pos.y))
    }
  })

  ipcMain.on(IPC.startPetDrag, (_event, pos: DragOffset) => {
    stopDrag()
    dragInterval = setInterval(() => {
      const win = getPetWindow()
      if (!win || !pos) {
        stopDrag()
        return
      }
      const cursor = screen.getCursorScreenPoint()
      win.setPosition(
        Math.round(cursor.x - pos.offsetX),
        Math.round(cursor.y - pos.offsetY)
      )
    }, 16)
  })

  ipcMain.on(IPC.endPetDrag, () => stopDrag())
}

function stopDrag (): void {
  if (dragInterval) {
    clearInterval(dragInterval)
    dragInterval = null
  }
}
