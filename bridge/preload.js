/**
 * preload.js - 桌面哈士奇插件应用预加载脚本
 */
const { ipcRenderer } = require('electron')

let petWindow = null
let currentPetConfig = {
  followMouse: true,
  allowSleep: true,
  clickFeedback: true,
  speed: 1,
  defaultState: 'idle',
  showOnStartup: true,
  tasks: []
}
let cursorPollInterval = null

ipcRenderer.on('show-pet-window', function () {
  if (window.services) {
    window.services.showPetWindow()
  }
})

ipcRenderer.on('hide-pet-window', function () {
  if (window.services) {
    window.services.hidePetWindow()
  }
})

ipcRenderer.on('move-pet-window', function (event, pos) {
  if (window.services && pos) {
    window.services.movePetWindow(pos.x, pos.y)
  }
})

// 子窗口通过 postMessage 回传的备选通道（兼容旧版 uTools）
window.addEventListener('message', function (event) {
  if (!event.data || !event.data.type) return
  if (event.data.type === 'show-pet-window') {
    if (window.services) window.services.showPetWindow()
  } else if (event.data.type === 'hide-pet-window') {
    if (window.services) window.services.hidePetWindow()
  } else if (event.data.type === 'move-pet-window') {
    if (window.services) window.services.movePetWindow(event.data.x, event.data.y)
  }
})

function isPetWindowAlive () {
  return petWindow !== null &&
    (typeof petWindow.isDestroyed !== 'function' || !petWindow.isDestroyed())
}

function sendPetConfig (config) {
  if (!config || !isPetWindowAlive()) return
  if (config.followMouse !== undefined || config.defaultState !== undefined || config.showOnStartup !== undefined) {
    currentPetConfig = { ...currentPetConfig, ...config }
  }
  if (petWindow.webContents && typeof petWindow.webContents.send === 'function') {
    petWindow.webContents.send('pet-config', config)
  }
}

function startCursorPoll () {
  if (cursorPollInterval) clearInterval(cursorPollInterval)
  cursorPollInterval = setInterval(function () {
    if (!isPetWindowAlive()) return
    if (!currentPetConfig.followMouse) return
    try {
      const cursor = utools.getCursorScreenPoint()
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

window.services = {
  /**
   * 创建/显示桌面哈士奇宠物窗口
   */
  createPetWindow: function (config) {
    if (isPetWindowAlive()) {
      if (typeof petWindow.focus === 'function') {
        petWindow.focus()
      }
      sendPetConfig(config)
      return
    }

    const cursorPoint = utools.getCursorScreenPoint()
    const currentDisplay = utools.getDisplayNearestPoint(cursorPoint)
    const displayBounds = currentDisplay.bounds
    const winSize = 220
    const startX = displayBounds.x + displayBounds.width - winSize - 60
    const startY = displayBounds.y + displayBounds.height - winSize - 80

    const createdWindow = utools.createBrowserWindow(
      'pet.html',
      {
        show: config.showOnStartup !== false,
        x: startX,
        y: startY,
        width: winSize,
        height: winSize,
        backgroundColor: '#00000000',
        thickFrame: false,
        resizable: false,
        fullscreenable: false,
        fullscreen: false,
        minimizable: false,
        maximizable: false,
        movable: true,
        autoHideMenuBar: true,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        enableLargerThanScreen: false,
        alwaysOnTop: true,
        roundedCorners: false,
        hasShadow: false,
        closable: true,
        webPreferences: {
          preload: 'pet_preload.js'
        }
      },
      function (browserWindow) {
        if (browserWindow) {
          petWindow = browserWindow
        }

        try {
          if (petWindow && typeof petWindow.setAlwaysOnTop === 'function') {
            petWindow.setAlwaysOnTop(true)
          }
        } catch (e) {}

        sendPetConfig(config)
      }
    )

    if (createdWindow) {
      petWindow = createdWindow
    }

    if (petWindow && typeof petWindow.on === 'function') {
      petWindow.on('closed', function () {
        petWindow = null
        stopCursorPoll()
      })
    }

    startCursorPoll()
  },

  /**
   * 显示宠物窗口
   */
  showPetWindow: function () {
    if (isPetWindowAlive() && typeof petWindow.show === 'function') {
      try {
        petWindow.show()
        petWindow.setAlwaysOnTop(true)
      } catch (e) {}
    }
  },

  /**
   * 隐藏宠物窗口
   */
  hidePetWindow: function () {
    if (isPetWindowAlive() && typeof petWindow.hide === 'function') {
      try {
        petWindow.hide()
      } catch (e) {}
    }
  },

  /**
   * 移动宠物窗口
   */
  movePetWindow: function (x, y) {
    if (isPetWindowAlive() && typeof petWindow.setPosition === 'function') {
      try {
        petWindow.setPosition(Math.round(x), Math.round(y))
      } catch (e) {}
    }
  },

  /**
   * 更新宠物配置
   */
  updatePetConfig: function (config) {
    sendPetConfig(config)
  },

  /**
   * 关闭宠物窗口
   */
  closePetWindow: function () {
    if (isPetWindowAlive() && typeof petWindow.close === 'function') {
      petWindow.close()
    }
    petWindow = null
  },

  /**
   * 检查宠物是否正在运行
   */
  isPetRunning: function () {
    return isPetWindowAlive()
  }
}
