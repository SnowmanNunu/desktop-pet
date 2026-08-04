import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { CursorInfo, PetConfig } from '../shared/types'

/** 提醒触发事件的载荷 */
export interface ReminderFiredPayload {
  title: string
  sticky: boolean
}

// 缓存主进程轮询来的全局光标信息（含所在显示器工作区）
let cursorInfo: CursorInfo | null = null
ipcRenderer.on(IPC.cursorPosition, (_event, info: CursorInfo) => {
  cursorInfo = info
})

const petApi = {
  /** 主动拉取当前配置（避免主进程启动时推送的竞态丢失） */
  getConfig: (): Promise<PetConfig> => ipcRenderer.invoke(IPC.getPetConfig),
  /** 移动宠物窗口到屏幕坐标 */
  setPosition: (x: number, y: number): void => {
    ipcRenderer.send(IPC.movePetWindow, { x, y })
  },
  /** 获取全局光标信息（主进程轮询缓存） */
  getCursorInfo: (): CursorInfo | null => cursorInfo,
  /** 开始全局拖拽（主进程接管窗口位置） */
  startDrag: (offsetX: number, offsetY: number): void => {
    ipcRenderer.send(IPC.startPetDrag, { offsetX, offsetY })
  },
  endDrag: (): void => {
    ipcRenderer.send(IPC.endPetDrag)
  },
  /** 稍后提醒（snooze） */
  snoozeReminder: (title: string, minutes: number): void => {
    ipcRenderer.invoke(IPC.snoozeReminder, title, minutes)
  },
  /** 监听配置更新 */
  onConfig: (callback: (config: PetConfig) => void): void => {
    ipcRenderer.on(IPC.petConfig, (_event, config: PetConfig) => callback(config))
  },
  /** 监听提醒触发 */
  onReminder: (callback: (payload: ReminderFiredPayload) => void): void => {
    ipcRenderer.on(IPC.reminderFired, (_event, payload: ReminderFiredPayload) =>
      callback(payload)
    )
  }
}

export type PetApi = typeof petApi

contextBridge.exposeInMainWorld('petApi', petApi)
