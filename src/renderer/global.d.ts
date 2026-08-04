import type { PanelApi } from '../preload/panel'
import type { PetApi } from '../preload/pet'

declare global {
  interface Window {
    /** 宠物窗口 preload 暴露的 API */
    petApi: PetApi
    /** 控制面板 preload 暴露的 API */
    panelApi: PanelApi
  }
}

export {}
