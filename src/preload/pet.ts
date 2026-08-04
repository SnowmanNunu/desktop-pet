import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { PetConfig, ScreenPoint } from '../shared/types'

// 缓存主进程轮询来的全局光标位置
let cursorPoint: ScreenPoint | null = null
ipcRenderer.on(IPC.cursorPosition, (_event, point: ScreenPoint) => {
  cursorPoint = point
})

const petApi = {
  /** 移动宠物窗口到屏幕坐标 */
  setPosition: (x: number, y: number): void => {
    ipcRenderer.send(IPC.movePetWindow, { x, y })
  },
  /** 获取全局光标位置（主进程轮询缓存） */
  getCursorScreenPoint: (): ScreenPoint | null => cursorPoint,
  /** 开始全局拖拽（主进程接管窗口位置） */
  startDrag: (offsetX: number, offsetY: number): void => {
    ipcRenderer.send(IPC.startPetDrag, { offsetX, offsetY })
  },
  endDrag: (): void => {
    ipcRenderer.send(IPC.endPetDrag)
  },
  /** 监听配置更新 */
  onConfig: (callback: (config: PetConfig) => void): void => {
    ipcRenderer.on(IPC.petConfig, (_event, config: PetConfig) => callback(config))
  },
  /** 监听提醒触发 */
  onReminder: (callback: (payload: { title: string }) => void): void => {
    ipcRenderer.on(IPC.reminderFired, (_event, payload: { title: string }) =>
      callback(payload)
    )
  }
}

export type PetApi = typeof petApi

contextBridge.exposeInMainWorld('petApi', petApi)
