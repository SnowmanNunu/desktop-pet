import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { PetConfig, Reminder } from '../shared/types'

const panelApi = {
  // 配置
  getConfig: (): Promise<PetConfig> => ipcRenderer.invoke(IPC.getPetConfig),
  updateConfig: (patch: Partial<PetConfig>): Promise<PetConfig> =>
    ipcRenderer.invoke(IPC.updatePetConfig, patch),

  // 宠物窗口
  isPetRunning: (): Promise<boolean> => ipcRenderer.invoke(IPC.isPetRunning),
  showPet: (): Promise<void> => ipcRenderer.invoke(IPC.showPet),
  hidePet: (): Promise<void> => ipcRenderer.invoke(IPC.hidePet),
  restartPet: (): Promise<void> => ipcRenderer.invoke(IPC.restartPet),

  // 提醒任务
  listReminders: (): Promise<Reminder[]> => ipcRenderer.invoke(IPC.listReminders),
  addReminder: (reminder: Omit<Reminder, 'id'>): Promise<Reminder[]> =>
    ipcRenderer.invoke(IPC.addReminder, reminder),
  updateReminder: (id: string, patch: Partial<Reminder>): Promise<Reminder[]> =>
    ipcRenderer.invoke(IPC.updateReminder, id, patch),
  deleteReminder: (id: string): Promise<Reminder[]> =>
    ipcRenderer.invoke(IPC.deleteReminder, id),
  importLegacyTasks: (reminders: Reminder[]): Promise<Reminder[]> =>
    ipcRenderer.invoke(IPC.importLegacyTasks, reminders),

  // 事件
  onPetStatus: (callback: (running: boolean) => void): void => {
    ipcRenderer.on(IPC.petStatus, (_event, running: boolean) => callback(running))
  },
  onRemindersChanged: (callback: (reminders: Reminder[]) => void): void => {
    ipcRenderer.on(IPC.remindersChanged, (_event, reminders: Reminder[]) =>
      callback(reminders)
    )
  }
}

export type PanelApi = typeof panelApi

contextBridge.exposeInMainWorld('panelApi', panelApi)
