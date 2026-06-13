/**
 * 独立桌面版 — 控制面板 preload
 * 模拟 uTools API，暴露 services 给 React 设置面板
 */
const { ipcRenderer } = require('electron')

// 同步状态（因为 App.js 里 isPetRunning 是同步调用的）
let petRunning = false

// 监听主进程发来的宠物窗口状态
ipcRenderer.on('pet-status', function (event, running) {
  petRunning = running
})

// 模拟 uTools API（App.js 用到了 onPluginEnter / onPluginOut / isDarkColors）
const mockUtools = {
  onPluginEnter: function (callback) {
    // 独立版打开控制面板即视为"进入插件"
    setTimeout(function () {
      callback()
    }, 100)
  },
  onPluginOut: function (callback) {
    // 独立版不做特殊处理
  },
  isDarkColors: function () {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
}

// services API（替换 bridge/preload.js 里的 uTools 版本）
const services = {
  createPetWindow: function (config) {
    ipcRenderer.send('create-pet', config)
    petRunning = true
  },
  updatePetConfig: function (config) {
    ipcRenderer.send('update-pet-config', config)
  },
  closePetWindow: function () {
    ipcRenderer.send('close-pet')
    petRunning = false
  },
  isPetRunning: function () {
    return petRunning
  }
}

window.utools = mockUtools
window.services = services
