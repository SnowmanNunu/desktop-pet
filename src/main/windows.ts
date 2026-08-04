import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { IPC } from '../shared/ipc-channels'
import { getConfig } from './config-store'

export const PET_WINDOW_SIZE = 220

let panelWindow: BrowserWindow | null = null
let petWindow: BrowserWindow | null = null

function rendererUrl (page: string): string | null {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  return devUrl ? `${devUrl}/${page}/index.html` : null
}

function rendererFile (page: string): string {
  return path.join(import.meta.dirname, `../renderer/${page}/index.html`)
}

function loadPage (win: BrowserWindow, page: string): void {
  const url = rendererUrl(page)
  if (url) {
    win.loadURL(url)
  } else {
    win.loadFile(rendererFile(page))
  }
}

// ========== 控制面板 ==========

export function createPanelWindow (): void {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.show()
    panelWindow.focus()
    return
  }

  panelWindow = new BrowserWindow({
    width: 400,
    height: 680,
    resizable: true,
    minWidth: 360,
    minHeight: 600,
    title: '旺财桌面宠物',
    icon: path.join(import.meta.dirname, '../../resources/logo.png'),
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/panel.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  loadPage(panelWindow, 'panel')

  // 面板关闭只是隐藏窗口，应用继续在后台运行（提醒引擎在主进程）
  panelWindow.on('close', (event) => {
    event.preventDefault()
    panelWindow?.hide()
  })
}

export function getPanelWindow (): BrowserWindow | null {
  return panelWindow && !panelWindow.isDestroyed() ? panelWindow : null
}

export function togglePanelWindow (): void {
  const win = getPanelWindow()
  if (!win) {
    createPanelWindow()
    return
  }
  if (win.isVisible()) {
    win.hide()
  } else {
    win.show()
    win.focus()
  }
}

// ========== 宠物窗口 ==========

export function createPetWindow (): void {
  if (petWindow && !petWindow.isDestroyed()) return

  const config = getConfig()
  const winSize = Math.round(PET_WINDOW_SIZE * config.petScale)
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.workArea
  const startX = x + width - winSize - 60
  const startY = y + height - winSize - 80

  petWindow = new BrowserWindow({
    x: startX,
    y: startY,
    width: winSize,
    height: winSize,
    show: config.showOnStartup,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreen: false,
    focusable: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/pet.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 提醒提示音：宠物窗口无用户手势也允许播放音频
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  loadPage(petWindow, 'pet')

  petWindow.once('ready-to-show', () => {
    if (!petWindow) return
    if (config.showOnStartup) {
      petWindow.show()
    }
    petWindow.setAlwaysOnTop(true)
    if (config.clickThrough) {
      petWindow.setIgnoreMouseEvents(true, { forward: true })
    }
    petWindow.webContents.send(IPC.petConfig, getConfig())
  })

  petWindow.on('closed', () => {
    petWindow = null
    notifyPetStatus()
  })

  // 宠物窗口的 console 转发到主进程日志（无窗口的环境下便于排查）
  petWindow.webContents.on('console-message', (details) => {
    const msg =
      typeof details === 'object' && details !== null && 'message' in details
        ? (details as { message: string }).message
        : String(details)
    console.log('[pet]', msg)
  })

  notifyPetStatus()
}

export function getPetWindow (): BrowserWindow | null {
  return petWindow && !petWindow.isDestroyed() ? petWindow : null
}

export function showPetWindow (): void {
  const win = getPetWindow()
  if (win) {
    win.show()
    win.setAlwaysOnTop(true)
  }
}

export function hidePetWindow (): void {
  getPetWindow()?.hide()
}

/** 调整宠物大小：以窗口中心为锚点缩放 */
export function applyPetScale (scale: number): void {
  const win = getPetWindow()
  if (!win) return
  const newSize = Math.round(PET_WINDOW_SIZE * scale)
  const [x, y, w] = [win.getBounds().x, win.getBounds().y, win.getBounds().width]
  win.setBounds({
    x: Math.round(x + w / 2 - newSize / 2),
    y: Math.round(y + w / 2 - newSize / 2),
    width: newSize,
    height: newSize
  })
}

/** 鼠标穿透：开启后宠物不响应任何交互（纯观赏） */
export function applyClickThrough (enabled: boolean): void {
  const win = getPetWindow()
  if (!win) return
  // forward: true 让窗口仍能收到 mousemove（不影响全局光标跟随）
  win.setIgnoreMouseEvents(enabled, { forward: true })
}

function notifyPetStatus (): void {
  const panel = getPanelWindow()
  panel?.webContents.send(IPC.petStatus, petWindow !== null)
}
