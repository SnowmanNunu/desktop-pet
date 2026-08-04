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
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  const startX = x + width - PET_WINDOW_SIZE - 60
  const startY = y + height - PET_WINDOW_SIZE - 80

  petWindow = new BrowserWindow({
    x: startX,
    y: startY,
    width: PET_WINDOW_SIZE,
    height: PET_WINDOW_SIZE,
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
      sandbox: false
    }
  })

  loadPage(petWindow, 'pet')

  petWindow.once('ready-to-show', () => {
    if (!petWindow) return
    if (config.showOnStartup) {
      petWindow.show()
    }
    petWindow.setAlwaysOnTop(true)
    petWindow.webContents.send(IPC.petConfig, getConfig())
  })

  petWindow.on('closed', () => {
    petWindow = null
    notifyPetStatus()
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

function notifyPetStatus (): void {
  const panel = getPanelWindow()
  panel?.webContents.send(IPC.petStatus, petWindow !== null)
}
