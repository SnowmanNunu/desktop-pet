/**
 * 桌面哈士奇 — 宠物窗口 preload
 * 接收主窗口/主进程发送的配置更新，并暴露窗口移动 API
 */
console.log('[pet_preload] loading')

let ipcRenderer = null
try {
  ipcRenderer = require('electron').ipcRenderer
  console.log('[pet_preload] ipcRenderer ready')
} catch (e) {
  console.log('[pet_preload] ipcRenderer not available:', e.message)
}

// 独立版：接收主进程配置信息
if (ipcRenderer) {
  ipcRenderer.on('pet-config', function (event, config) {
    window.postMessage({ type: 'pet-config', config: config }, '*')
  })

  // 独立版：窗口关闭请求
  ipcRenderer.on('close-pet', function () {
    window.close()
  })

  // 独立版：主进程定时发来的光标位置
  ipcRenderer.on('cursor-position', function (event, pos) {
    window.postMessage({ type: 'cursor-position', x: pos.x, y: pos.y }, '*')
  })
}

let cachedCursor = null

function sendToParent (type, data) {
  if (typeof utools !== 'undefined' && typeof utools.sendToParent === 'function') {
    if (data !== undefined) {
      utools.sendToParent(type, data)
    } else {
      utools.sendToParent(type)
    }
  } else if (window.opener) {
    try {
      const message = { type: type }
      if (data !== undefined) Object.assign(message, data)
      window.opener.postMessage(message, '*')
    } catch (e) {}
  }
}

// 暴露给宠物渲染进程的统一 API
window.petApi = {
  /**
   * 移动宠物窗口到指定屏幕坐标
   */
  setPosition: function (x, y) {
    console.log('[pet_preload] setPosition', x, y)
    if (ipcRenderer) {
      ipcRenderer.send('move-pet-window', { x: x, y: y })
    } else {
      sendToParent('move-pet-window', { x: x, y: y })
    }
  },

  /**
   * 获取当前鼠标在屏幕上的坐标
   */
  getCursorScreenPoint: function () {
    // 优先使用由父进程/uTools 主进程定时推送的光标位置
    if (cachedCursor) return cachedCursor
    if (typeof utools !== 'undefined' && typeof utools.getCursorScreenPoint === 'function') {
      return utools.getCursorScreenPoint()
    }
    return null
  },

  /**
   * 显示宠物窗口
   */
  show: function () {
    console.log('[pet_preload] show called')
    if (ipcRenderer) {
      ipcRenderer.send('show-pet-window')
    } else {
      sendToParent('show-pet-window')
    }
  },

  /**
   * 隐藏宠物窗口
   */
  hide: function () {
    console.log('[pet_preload] hide called')
    if (ipcRenderer) {
      ipcRenderer.send('hide-pet-window')
    } else {
      sendToParent('hide-pet-window')
    }
  },

  /**
   * 开始全局拖拽（独立版：由主进程轮询鼠标位置并移动窗口）
   */
  startDrag: function (offsetX, offsetY) {
    if (ipcRenderer) {
      ipcRenderer.send('start-pet-drag', { offsetX: offsetX, offsetY: offsetY })
    }
  },

  /**
   * 结束全局拖拽
   */
  endDrag: function () {
    if (ipcRenderer) {
      ipcRenderer.send('end-pet-drag')
    }
  }
}
