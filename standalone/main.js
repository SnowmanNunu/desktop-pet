/**
 * 桌面哈士奇 — 独立桌面版主进程
 * 不依赖 uTools，纯 Electron 运行
 */
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron')
const path = require('path')

let controlWindow = null
let petWindow = null
let tray = null

const DIST_DIR = path.join(__dirname, '..', 'dist')

const DEFAULT_PET_CONFIG = {
  followMouse: true,
  allowSleep: true,
  clickFeedback: true,
  speed: 1,
  defaultState: 'idle',
  showOnStartup: true,
  tasks: []
}

let currentPetConfig = { ...DEFAULT_PET_CONFIG }

function createControlWindow () {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.focus()
    controlWindow.show()
    return
  }

  controlWindow = new BrowserWindow({
    width: 400,
    height: 680,
    resizable: true,
    minWidth: 360,
    minHeight: 600,
    title: '桌面哈士奇',
    icon: path.join(DIST_DIR, 'logo.png'),
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false
    }
  })

  controlWindow.loadFile(path.join(DIST_DIR, 'index.html'))

  controlWindow.on('closed', function () {
    controlWindow = null
    closePetWindow()
  })
}

function createPetWindow (config) {
  if (config) {
    currentPetConfig = { ...currentPetConfig, ...config }
  }
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  const winSize = 220
  const startX = x + width - winSize - 60
  const startY = y + height - winSize - 80

  petWindow = new BrowserWindow({
    x: startX,
    y: startY,
    width: winSize,
    height: winSize,
    show: config.showOnStartup !== false,
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
      preload: path.join(DIST_DIR, 'pet_preload.js'),
      contextIsolation: false,
      nodeIntegration: false
    }
  })

  petWindow.loadFile(path.join(DIST_DIR, 'pet.html'))

  petWindow.once('ready-to-show', function () {
    petWindow.show()
    petWindow.setAlwaysOnTop(true)
    // 宠物窗口需要接收鼠标事件，不设置 setIgnoreMouseEvents
    if (currentPetConfig) {
      petWindow.webContents.send('pet-config', currentPetConfig)
    }
    startCursorPoll()
  })

  petWindow.on('closed', function () {
    petWindow = null
    stopCursorPoll()
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('pet-status', false)
    }
  })
}

function closePetWindow () {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.close()
  }
  petWindow = null
}

function createTray () {
  tray = new Tray(path.join(DIST_DIR, 'logo.png'))
  updateTrayMenu()
  tray.setToolTip('桌面哈士奇')
  tray.on('click', function () {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.focus()
      controlWindow.show()
    } else {
      createControlWindow()
    }
  })
}

function updateTrayMenu () {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🐺 桌面哈士奇',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '打开控制面板',
      click: function () {
        createControlWindow()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: function () {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)
}

// IPC handlers
ipcMain.on('create-pet', function (event, config) {
  if (!petWindow || petWindow.isDestroyed()) {
    createPetWindow(config)
  } else {
    petWindow.webContents.send('pet-config', config)
  }
})

ipcMain.on('update-pet-config', function (event, config) {
  if (config) {
    currentPetConfig = { ...currentPetConfig, ...config }
  }
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet-config', currentPetConfig)
  }
})

ipcMain.on('move-pet-window', function (event, pos) {
  if (petWindow && !petWindow.isDestroyed() && pos) {
    petWindow.setPosition(Math.round(pos.x), Math.round(pos.y))
  }
})

let petDragInterval = null
let cursorPollInterval = null

function startCursorPoll () {
  if (cursorPollInterval) clearInterval(cursorPollInterval)
  cursorPollInterval = setInterval(function () {
    if (!petWindow || petWindow.isDestroyed()) return
    if (!currentPetConfig.followMouse) return
    try {
      const cursor = screen.getCursorScreenPoint()
      petWindow.webContents.send('cursor-position', { x: cursor.x, y: cursor.y })
    } catch (e) {}
  }, 30)
}

function stopCursorPoll () {
  if (cursorPollInterval) {
    clearInterval(cursorPollInterval)
    cursorPollInterval = null
  }
}

ipcMain.on('start-pet-drag', function (event, pos) {
  if (petDragInterval) clearInterval(petDragInterval)
  petDragInterval = setInterval(function () {
    if (!petWindow || petWindow.isDestroyed() || !pos) {
      clearInterval(petDragInterval)
      petDragInterval = null
      return
    }
    const cursor = screen.getCursorScreenPoint()
    petWindow.setPosition(Math.round(cursor.x - pos.offsetX), Math.round(cursor.y - pos.offsetY))
  }, 16)
})

ipcMain.on('end-pet-drag', function () {
  if (petDragInterval) {
    clearInterval(petDragInterval)
    petDragInterval = null
  }
})

ipcMain.on('close-pet', function () {
  closePetWindow()
})

ipcMain.on('show-pet-window', function () {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.show()
    petWindow.setAlwaysOnTop(true)
  }
})

ipcMain.on('hide-pet-window', function () {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.hide()
  }
})

ipcMain.handle('is-pet-running', function () {
  return petWindow !== null && !petWindow.isDestroyed()
})

app.whenReady().then(function () {
  createControlWindow()
  createTray()

  // 全局快捷键 Ctrl+Shift+S：显示/隐藏控制面板
  globalShortcut.register('CommandOrControl+Shift+S', function () {
    if (controlWindow && !controlWindow.isDestroyed()) {
      if (controlWindow.isVisible()) {
        controlWindow.hide()
      } else {
        controlWindow.show()
        controlWindow.focus()
      }
    }
  })

  app.on('activate', function () {
    if (controlWindow === null) {
      createControlWindow()
    }
  })
})

app.on('will-quit', function () {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', function () {
  // 控制面板关闭后自动退出整个应用
  app.quit()
})
