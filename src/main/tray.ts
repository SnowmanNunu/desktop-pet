import { Menu, Tray, app, nativeImage } from 'electron'
import path from 'node:path'
import { createPanelWindow } from './windows'

let tray: Tray | null = null

export function createTray (): void {
  const icon = nativeImage.createFromPath(
    path.join(import.meta.dirname, '../../resources/logo.png')
  )
  if (process.platform === 'darwin') {
    tray = new Tray(icon.resize({ width: 18, height: 18 }))
  } else {
    tray = new Tray(icon)
  }

  const menu = Menu.buildFromTemplate([
    { label: '🐺 哈士奇桌面宠物', enabled: false },
    { type: 'separator' },
    { label: '打开控制面板', click: () => createPanelWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.exit(0) }
  ])

  tray.setToolTip('哈士奇桌面宠物')
  tray.setContextMenu(menu)
  tray.on('click', () => createPanelWindow())
}
