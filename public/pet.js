/**
 * 桌面哈士奇 — 宠物核心
 * Canvas 程序化绘制、状态机、鼠标交互、窗口移动
 */
(function () {
  'use strict'

  const canvas = document.getElementById('petCanvas')
  const ctx = canvas.getContext('2d')

  // 内部逻辑画布尺寸（CSS 像素）
  const LOGICAL_SIZE = 220
  // 宠物中心基准点（CSS 像素）
  const CENTER_X = LOGICAL_SIZE / 2
  const CENTER_Y = 165

  let width = LOGICAL_SIZE
  let height = LOGICAL_SIZE
  let dpr = 1
  let animId = null
  let lastTime = 0

  // 配置
  const config = {
    followMouse: true,
    allowSleep: true,
    clickFeedback: true,
    speed: 1,
    defaultState: 'idle',
    showOnStartup: true,
    tasks: []
  }

  // 定时任务
  const TASKS_STORAGE_KEY = 'desktop-pet-tasks'
  let tasks = []
  let taskCheckInterval = null
  let reminder = {
    text: null,
    timer: 0,
    duration: 8
  }

  // 鼠标/交互状态
  const mouse = {
    x: 0,
    y: 0,
    active: false,
    timer: null,
    down: false,
    downTime: 0,
    downX: 0,
    downY: 0
  }

  // 全局光标位置（用于跟随鼠标）
  const cursor = {
    x: 0,
    y: 0,
    hasPosition: false
  }

  // 拖拽状态
  const drag = {
    active: false,
    startWinX: 0,
    startWinY: 0,
    startMouseX: 0,
    startMouseY: 0
  }

  // 哈士奇状态
  const husky = {
    state: 'idle',
    stateTime: 0,
    // 窗口在屏幕上的位置
    winX: 0,
    winY: 0,
    facing: 1,
    // 移动目标（屏幕坐标）
    targetX: null,
    targetY: null,
    // 动画相位
    walkPhase: 0,
    tailPhase: 0,
    blinkTimer: 0,
    blinking: false,
    nextBlink: 1.5 + Math.random() * 2,
    // 状态专用
    jumpVelocity: 0,
    jumpY: 0,
    barkTimer: 0,
    yawnTimer: 0,
    // 点击反馈效果
    reactionText: null,
    reactionTimer: 0,
    reactionIndex: 0,
    // 自动行为计时
    nextStateChange: 2 + Math.random() * 3
  }

  const STATE = {
    IDLE: 'idle',
    WALK: 'walk',
    SIT: 'sit',
    SLEEP: 'sleep',
    LOOK: 'look_at_mouse',
    DRAG: 'drag',
    JUMP: 'jump',
    BARK: 'bark'
  }

  // 颜色
  const COLORS = {
    fur: '#4a5d7a',
    furDark: '#2f3f52',
    white: '#f5f8fb',
    nose: '#1a1a1a',
    eye: '#3ba3f5',
    pupil: '#0f1720',
    tongue: '#ff8fa3',
    shadow: 'rgba(0,0,0,0.15)'
  }

  // ========== 初始化与尺寸 ==========

  function resize () {
    width = LOGICAL_SIZE
    height = LOGICAL_SIZE
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function init () {
    console.log('[pet] init start')
    resize()
    window.addEventListener('resize', resize)

    // 初始位置：屏幕右下角偏上
    const startX = Math.max(0, window.screen.availWidth - LOGICAL_SIZE - 60)
    const startY = Math.max(0, window.screen.availHeight - LOGICAL_SIZE - 80)
    moveWindow(startX, startY)

    if (config.defaultState === 'sleep') {
      setState(STATE.SLEEP)
    } else if (config.defaultState === 'sit') {
      setState(STATE.SIT)
    } else {
      setState(STATE.IDLE)
    }

    bindEvents()

    // 加载定时任务并开始检查
    tasks = loadTasks()
    startTaskChecker()

    animId = requestAnimationFrame(animate)
    console.log('[pet] init done')
  }

  // ========== 定时任务 ==========

  function loadTasks () {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }

  function saveTasks () {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    } catch (e) {}
  }

  function setTasks (newTasks) {
    tasks = Array.isArray(newTasks) ? newTasks : []
    saveTasks()
  }

  function startTaskChecker () {
    if (taskCheckInterval) clearInterval(taskCheckInterval)
    checkTasks()
    taskCheckInterval = setInterval(checkTasks, 1000 * 15)
  }

  function checkTasks () {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const currentTime = hh + ':' + mm
    const day = now.getDay()
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

    let changed = false
    tasks.forEach(function (task) {
      if (!task.enabled) return
      if (task.time !== currentTime) return
      if (task.lastReminded === dateStr) return

      let shouldRemind = false
      if (task.repeat === 'once') {
        if (!task.lastReminded) shouldRemind = true
      } else if (task.repeat === 'daily') {
        shouldRemind = true
      } else if (task.repeat === 'weekdays') {
        if (day >= 1 && day <= 5) shouldRemind = true
      } else if (task.repeat === 'weekends') {
        if (day === 0 || day === 6) shouldRemind = true
      }

      if (shouldRemind) {
        showReminder(task.content)
        task.lastReminded = dateStr
        if (task.repeat === 'once') {
          task.enabled = false
        }
        changed = true
      }
    })

    if (changed) saveTasks()
  }

  function showReminder (text) {
    reminder.text = text
    reminder.timer = 0
    // 提醒时让哈士奇跳一下，并确保窗口可见
    setState(STATE.JUMP)
    husky.jumpVelocity = -360
    husky.jumpY = 0
    if (window.petApi && window.petApi.show) {
      window.petApi.show()
    }
  }

  // ========== 事件绑定 ==========

  function bindEvents () {
    // 使用 Pointer Events + setPointerCapture，拖拽时鼠标移出窗口也能继续
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)

    // 鼠标事件后备：某些环境下 Pointer Events 无法触发（透明无边框窗口、focusable:false 等）
    canvas.addEventListener('mousedown', onMouseDownFallback)
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)

    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'pet-config') {
        applyConfig(event.data.config)
      } else if (event.data && event.data.type === 'cursor-position') {
        cursor.x = event.data.x
        cursor.y = event.data.y
        cursor.hasPosition = true
      }
    })
  }

  function onMouseDownFallback (e) {
    if (e.button !== 0) return
    // 如果 Pointer Events 已经触发过，忽略鼠标事件
    if (mouse.down) return
    onPointerDown({ button: 0, clientX: e.clientX, clientY: e.clientY, pointerId: 1 })
  }

  function onWindowMouseMove (e) {
    if (!mouse.down) return
    // 若 Pointer Events 捕获仍然有效，则忽略鼠标事件，避免重复处理
    if (mouse.lastPointerId && canvas.hasPointerCapture && canvas.hasPointerCapture(mouse.lastPointerId)) {
      return
    }
    onPointerMove({ clientX: e.clientX, clientY: e.clientY })
  }

  function onWindowMouseUp (e) {
    if (!mouse.down) return
    if (mouse.lastPointerId && canvas.hasPointerCapture && canvas.hasPointerCapture(mouse.lastPointerId)) {
      return
    }
    onPointerUp({ pointerId: mouse.lastPointerId || 0 })
  }

  function markMouseActive () {
    mouse.active = true
    clearTimeout(mouse.timer)
    mouse.timer = setTimeout(function () {
      mouse.active = false
    }, 800)
  }

  function onPointerMove (e) {
    mouse.x = e.clientX
    mouse.y = e.clientY
    markMouseActive()

    if (mouse.down && !drag.active) {
      const dx = e.clientX - mouse.downX
      const dy = e.clientY - mouse.downY
      const dt = performance.now() - mouse.downTime
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8 || dt > 250) {
        startDrag(e.clientX, e.clientY)
      }
    }

    // 如果主进程接管了全局拖拽，这里不再自己计算窗口位置
    if (drag.active && !drag.native) {
      const newX = drag.startWinX + (e.clientX - drag.startMouseX)
      const newY = drag.startWinY + (e.clientY - drag.startMouseY)
      moveWindow(newX, newY)
    }
  }

  function onPointerDown (e) {
    if (e.button !== 0) return
    console.log('[pet] pointerdown', e.clientX, e.clientY)
    mouse.down = true
    mouse.lastPointerId = e.pointerId
    mouse.downTime = performance.now()
    mouse.downX = e.clientX
    mouse.downY = e.clientY
    drag.startMouseX = e.clientX
    drag.startMouseY = e.clientY
    drag.startWinX = husky.winX
    drag.startWinY = husky.winY
    drag.native = false
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch (err) {}
  }

  function onPointerUp (e) {
    if (!mouse.down) return
    mouse.down = false
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch (err) {}

    if (drag.active) {
      if (drag.native && window.petApi && window.petApi.endDrag) {
        window.petApi.endDrag()
      }
      drag.active = false
      drag.native = false
      document.body.classList.remove('dragging')
      setState(STATE.IDLE)
      return
    }

    // 点击正在显示的提醒可立即关闭
    if (reminder.text) {
      reminder.text = null
      reminder.timer = 0
      return
    }

    const dt = performance.now() - mouse.downTime
    if (dt < 400 && config.clickFeedback) {
      triggerClickReaction()
    }
  }

  function onPointerLeave () {
    mouse.active = false
  }

  function startDrag (clientX, clientY) {
    console.log('[pet] startDrag', clientX, clientY)
    drag.active = true
    drag.native = false
    document.body.classList.add('dragging')
    setState(STATE.DRAG)

    // 独立版：通知主进程开始全局拖拽
    if (window.petApi && window.petApi.startDrag) {
      drag.native = true
      window.petApi.startDrag(clientX, clientY)
    }
  }

  // 兼容触屏：Pointer Events 已经统一处理，保留 touch 事件作为后备
  function onTouchStart (e) {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    mouse.down = true
    mouse.downTime = performance.now()
    mouse.downX = t.clientX
    mouse.downY = t.clientY
    drag.startMouseX = t.clientX
    drag.startMouseY = t.clientY
    drag.startWinX = husky.winX
    drag.startWinY = husky.winY
    onPointerMove({ clientX: t.clientX, clientY: t.clientY })
  }

  function onTouchMove (e) {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    onPointerMove({ clientX: t.clientX, clientY: t.clientY })
  }

  function onTouchEnd (e) {
    onPointerUp(e)
  }

  function triggerClickReaction () {
    if (husky.state === STATE.SLEEP) {
      setState(STATE.IDLE)
      showReaction('早~')
      return
    }

    // 循环三种明显反馈：跳 → 叫 → 坐下
    const reactions = [
      { state: STATE.JUMP, text: '嘿！' },
      { state: STATE.BARK, text: '汪！' },
      { state: STATE.SIT, text: '乖巧' }
    ]
    const reaction = reactions[husky.reactionIndex % reactions.length]
    husky.reactionIndex += 1

    showReaction(reaction.text)

    if (reaction.state === STATE.JUMP) {
      setState(STATE.JUMP)
      husky.jumpVelocity = -340
      husky.jumpY = 0
    } else if (reaction.state === STATE.BARK) {
      setState(STATE.BARK)
      husky.barkTimer = 0
    } else {
      setState(STATE.SIT)
    }
  }

  function showReaction (text) {
    husky.reactionText = text
    husky.reactionTimer = 0
  }

  // ========== 配置应用 ==========

  function applyConfig (newConfig) {
    if (!newConfig) return
    console.log('[pet] applyConfig', JSON.stringify(newConfig))
    const prevDefaultState = config.defaultState
    const prevShowOnStartup = config.showOnStartup
    Object.assign(config, newConfig)
    if (newConfig.tasks !== undefined) {
      setTasks(newConfig.tasks)
    }
    if (newConfig.defaultState !== undefined && newConfig.defaultState !== prevDefaultState) {
      console.log('[pet] defaultState changed to', config.defaultState)
      if (config.defaultState === 'sleep') {
        setState(STATE.SLEEP)
      } else if (config.defaultState === 'sit') {
        setState(STATE.SIT)
      } else {
        setState(STATE.IDLE)
      }
    }
    if (newConfig.showOnStartup !== undefined && newConfig.showOnStartup !== prevShowOnStartup) {
      console.log('[pet] showOnStartup changed to', config.showOnStartup)
      if (config.showOnStartup) {
        if (window.petApi && window.petApi.show) window.petApi.show()
      } else {
        if (window.petApi && window.petApi.hide) window.petApi.hide()
      }
    }
  }

  // ========== 窗口移动 ==========

  function moveWindow (x, y) {
    husky.winX = Math.round(x)
    husky.winY = Math.round(y)
    if (window.petApi && typeof window.petApi.setPosition === 'function') {
      window.petApi.setPosition(husky.winX, husky.winY)
    }
  }

  function getMouseScreenPos () {
    // 鼠标在屏幕上的坐标 = 窗口位置 + 窗口内坐标
    return {
      x: husky.winX + mouse.x,
      y: husky.winY + mouse.y
    }
  }

  function updateGlobalCursor () {
    if (!config.followMouse) {
      cursor.hasPosition = false
      return
    }
    try {
      const point = window.petApi && window.petApi.getCursorScreenPoint
        ? window.petApi.getCursorScreenPoint()
        : null
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        cursor.x = point.x
        cursor.y = point.y
        cursor.hasPosition = true
      }
    } catch (e) {
      console.log('[pet] updateGlobalCursor error', e.message)
    }
  }

  // ========== 状态机 ==========

  function setState (newState) {
    if (husky.state === newState) {
      husky.stateTime = 0
      return
    }
    husky.state = newState
    husky.stateTime = 0
    husky.jumpY = 0
    husky.barkTimer = 0

    if (newState === STATE.IDLE) {
      husky.nextStateChange = 2 + Math.random() * 3
    } else if (newState === STATE.WALK) {
      husky.walkPhase = 0
    } else if (newState === STATE.SIT) {
      husky.nextStateChange = 3 + Math.random() * 4
    } else if (newState === STATE.SLEEP) {
      husky.nextStateChange = 6 + Math.random() * 8
    }
  }

  function pickAutonomousState () {
    if (husky.state !== STATE.IDLE) return
    const r = Math.random()
    if (config.allowSleep && r < 0.18) {
      setState(STATE.SLEEP)
    } else if (r < 0.45) {
      setState(STATE.SIT)
    } else if (r < 0.75) {
      // 随机走到屏幕内某处
      husky.targetX = Math.random() * (window.screen.availWidth - LOGICAL_SIZE)
      husky.targetY = Math.random() * (window.screen.availHeight - LOGICAL_SIZE)
      setState(STATE.WALK)
    } else {
      setState(STATE.IDLE)
      husky.nextStateChange = 2 + Math.random() * 2
    }
  }

  function updateState (deltaSec) {
    if (husky.state === STATE.DRAG) {
      if (!mouse.down) {
        drag.active = false
        document.body.classList.remove('dragging')
        setState(STATE.IDLE)
      }
      return
    }

    // sleep 被鼠标活动唤醒
    if (husky.state === STATE.SLEEP && mouse.active) {
      setState(STATE.IDLE)
      return
    }

    // jump / bark / yawn 等一次性动画结束回归 idle
    if (husky.state === STATE.JUMP) {
      husky.jumpY += husky.jumpVelocity * deltaSec
      husky.jumpVelocity += 1000 * deltaSec
      if (husky.jumpY >= 0) {
        husky.jumpY = 0
        setState(STATE.IDLE)
      }
      return
    }

    if (husky.state === STATE.BARK) {
      husky.barkTimer += deltaSec
      if (husky.barkTimer > 0.45) {
        setState(STATE.IDLE)
      }
      return
    }

    // 跟随鼠标逻辑（使用全局光标位置）
    if (config.followMouse && cursor.hasPosition) {
      const centerX = husky.winX + LOGICAL_SIZE / 2
      const centerY = husky.winY + LOGICAL_SIZE / 2
      const dx = cursor.x - centerX
      const dy = cursor.y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 90) {
        husky.targetX = cursor.x - LOGICAL_SIZE / 2
        husky.targetY = cursor.y - LOGICAL_SIZE / 2
        if (husky.state !== STATE.WALK) {
          setState(STATE.WALK)
        }
      } else if (husky.state !== STATE.LOOK && husky.state !== STATE.SIT && husky.state !== STATE.SLEEP) {
        setState(STATE.LOOK)
      }
      return
    }

    if (husky.state === STATE.WALK) {
      moveTowardTarget(deltaSec)
      return
    }

    if (husky.state === STATE.LOOK) {
      // 看鼠标：更新朝向（优先使用全局光标）
      const lookX = cursor.hasPosition ? cursor.x : getMouseScreenPos().x
      const centerX = husky.winX + LOGICAL_SIZE / 2
      if (lookX > centerX) husky.facing = 1
      else husky.facing = -1

      if (husky.stateTime > 3) {
        setState(STATE.IDLE)
      }
      return
    }

    if (husky.state === STATE.SIT || husky.state === STATE.SLEEP) {
      if (husky.stateTime > husky.nextStateChange) {
        setState(STATE.IDLE)
      }
      return
    }

    if (husky.state === STATE.IDLE) {
      if (husky.stateTime > husky.nextStateChange) {
        pickAutonomousState()
      }
    }
  }

  function moveTowardTarget (deltaSec) {
    if (husky.targetX == null || husky.targetY == null) {
      setState(STATE.IDLE)
      return
    }

    // 限制在屏幕可用区域内
    const maxX = window.screen.availWidth - LOGICAL_SIZE
    const maxY = window.screen.availHeight - LOGICAL_SIZE
    husky.targetX = Math.max(0, Math.min(maxX, husky.targetX))
    husky.targetY = Math.max(0, Math.min(maxY, husky.targetY))

    const dx = husky.targetX - husky.winX
    const dy = husky.targetY - husky.winY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 8) {
      setState(STATE.IDLE)
      return
    }

    const speed = 120 * config.speed
    const move = Math.min(dist, speed * deltaSec)
    const nx = dx / dist
    const ny = dy / dist

    husky.facing = nx >= 0 ? 1 : -1
    husky.walkPhase += deltaSec * (speed / 25)
    moveWindow(husky.winX + nx * move, husky.winY + ny * move)
  }

  // ========== 绘制 ==========

  function animate (timestamp) {
    animId = requestAnimationFrame(animate)

    if (lastTime === 0) {
      lastTime = timestamp
      return
    }
    let deltaSec = (timestamp - lastTime) / 1000
    if (deltaSec > 0.1) deltaSec = 0.1
    lastTime = timestamp
    const timeSec = timestamp * 0.001

    updateBlink(deltaSec)
    updateTail(deltaSec)
    updateGlobalCursor()
    updateState(deltaSec)

    if (husky.reactionText) {
      husky.reactionTimer += deltaSec
      if (husky.reactionTimer > 1.2) {
        husky.reactionText = null
      }
    }

    if (reminder.text) {
      reminder.timer += deltaSec
      if (reminder.timer > reminder.duration) {
        reminder.text = null
        reminder.timer = 0
      }
    }

    ctx.clearRect(0, 0, width, height)
    drawScene(timeSec)
  }

  function updateBlink (deltaSec) {
    husky.blinkTimer += deltaSec
    if (husky.blinking) {
      if (husky.blinkTimer > 0.15) {
        husky.blinking = false
        husky.blinkTimer = 0
        husky.nextBlink = 1.5 + Math.random() * 2.5
      }
    } else if (husky.blinkTimer > husky.nextBlink) {
      husky.blinking = true
      husky.blinkTimer = 0
    }
  }

  function updateTail (deltaSec) {
    let speed = 4
    if (husky.state === STATE.WALK) speed = 8
    if (husky.state === STATE.BARK || husky.state === STATE.JUMP) speed = 16
    if (husky.state === STATE.SLEEP) speed = 0.5
    husky.tailPhase += deltaSec * speed
  }

  function getStateParams (timeSec) {
    const params = {
      bodyY: 0,
      bodyTilt: 0,
      headTilt: 0,
      headY: 0,
      legPhase: 0,
      legLift: 0,
      tailWag: 0.25,
      mouthOpen: 0,
      eyeOpen: 1,
      earAngle: 0,
      shadowScale: 1,
      tongueOut: 0
    }

    if (husky.state === STATE.SIT) {
      params.bodyY = 18
      params.bodyTilt = 0.18
      params.headY = 12
      params.legLift = 0
      params.tailWag = 0.1
    } else if (husky.state === STATE.SLEEP) {
      params.bodyY = 28
      params.headY = 24
      params.eyeOpen = 0
      params.earAngle = -0.15
      params.tailWag = 0.02
      params.shadowScale = 1.05
    } else if (husky.state === STATE.WALK) {
      const bounce = Math.abs(Math.sin(husky.walkPhase)) * 4
      params.bodyY = -bounce
      params.legPhase = husky.walkPhase
      params.legLift = 8
      params.tailWag = 0.45
    } else if (husky.state === STATE.LOOK) {
      params.tailWag = 0.35
      params.headTilt = Math.sin(timeSec * 2) * 0.08
    } else if (husky.state === STATE.DRAG) {
      params.bodyY = -6
      params.earAngle = -0.1
      params.eyeOpen = 0.7
      params.tailWag = 0.05
    } else if (husky.state === STATE.JUMP) {
      params.bodyY = husky.jumpY - 35
      params.legLift = 18
      params.mouthOpen = 0.4
      params.tongueOut = 0.3
      params.tailWag = 0.6
    } else if (husky.state === STATE.BARK) {
      params.mouthOpen = 0.5 + Math.sin(husky.barkTimer * 30) * 0.2
      params.tongueOut = 0.4
      params.earAngle = 0.1
      params.tailWag = 0.7
    }

    // 拖拽时始终眨眼/眯眼
    if (husky.state === STATE.DRAG) {
      params.eyeOpen = 0.6
    }

    return params
  }

  function drawScene (timeSec) {
    const params = getStateParams(timeSec)

    ctx.save()
    ctx.translate(CENTER_X, CENTER_Y + params.bodyY)
    ctx.scale(husky.facing, 1)

    drawShadow(params.shadowScale)
    drawTail(params.tailWag)
    drawLegs(params.legPhase, params.legLift)
    drawBody(params.bodyTilt)
    drawHead(params.headY, params.headTilt, params.mouthOpen, params.eyeOpen, params.earAngle, params.tongueOut)

    if (husky.reactionText) {
      drawReactionText()
    }

    if (reminder.text) {
      drawReminderText()
    }

    ctx.restore()
  }

  function drawShadow (scale) {
    ctx.save()
    ctx.translate(0, 70)
    ctx.scale(scale, 1)
    ctx.beginPath()
    ctx.ellipse(0, 0, 58, 14, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.shadow
    ctx.fill()
    ctx.restore()
  }

  function drawTail (wag) {
    const angle = Math.sin(husky.tailPhase) * wag
    ctx.save()
    ctx.translate(-50, 15)
    ctx.rotate(-0.5 + angle)

    // 蓬松尾巴主体
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-25, -15, -45, -45, -40, -75)
    ctx.bezierCurveTo(-35, -90, -10, -95, 5, -80)
    ctx.bezierCurveTo(20, -60, 18, -30, 8, -10)
    ctx.bezierCurveTo(5, -5, 2, 0, 0, 0)
    ctx.closePath()

    const grad = ctx.createLinearGradient(-15, -10, -30, -80)
    grad.addColorStop(0, COLORS.fur)
    grad.addColorStop(0.6, COLORS.fur)
    grad.addColorStop(1, COLORS.white)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 尾巴尖端白毛
    ctx.beginPath()
    ctx.ellipse(-32, -78, 14, 10, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.white
    ctx.fill()

    ctx.restore()
  }

  function drawLegs (phase, lift) {
    const leftOffset = Math.sin(phase) * lift
    const rightOffset = Math.sin(phase + Math.PI) * lift

    drawLeg(-28, 28 + leftOffset, 1)
    drawLeg(28, 28 + rightOffset, 1)
  }

  function drawLeg (x, y, scale) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, 1)

    // 腿主体
    ctx.beginPath()
    ctx.moveTo(-10, -18)
    ctx.quadraticCurveTo(-12, 5, -10, 30)
    ctx.lineTo(10, 30)
    ctx.quadraticCurveTo(12, 5, 10, -18)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, -18, 0, 30)
    grad.addColorStop(0, COLORS.fur)
    grad.addColorStop(0.5, COLORS.white)
    grad.addColorStop(1, COLORS.white)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 爪子
    ctx.beginPath()
    ctx.ellipse(0, 32, 12, 7, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.white
    ctx.fill()
    ctx.stroke()

    // 爪缝
    ctx.beginPath()
    ctx.moveTo(-4, 30)
    ctx.lineTo(-4, 35)
    ctx.moveTo(0, 31)
    ctx.lineTo(0, 36)
    ctx.moveTo(4, 30)
    ctx.lineTo(4, 35)
    ctx.strokeStyle = 'rgba(47,63,82,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.restore()
  }

  function drawBody (tilt) {
    ctx.save()
    ctx.rotate(tilt)

    // 身体主体
    ctx.beginPath()
    ctx.ellipse(0, 0, 62, 48, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.fur
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 胸腹白毛
    ctx.beginPath()
    ctx.ellipse(0, 10, 42, 30, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.white
    ctx.fill()

    // 胸毛纹理
    ctx.beginPath()
    ctx.moveTo(-20, -2)
    ctx.quadraticCurveTo(0, 14, 20, -2)
    ctx.moveTo(-14, 12)
    ctx.quadraticCurveTo(0, 26, 14, 12)
    ctx.moveTo(-8, 24)
    ctx.quadraticCurveTo(0, 34, 8, 24)
    ctx.strokeStyle = 'rgba(200,210,220,0.45)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
  }

  function drawHead (headY, headTilt, mouthOpen, eyeOpen, earAngle, tongueOut) {
    ctx.save()
    ctx.translate(0, -60 + headY)
    ctx.rotate(headTilt)

    // 耳朵（在头后面）
    drawEar(-32, -38, -earAngle)
    drawEar(32, -38, earAngle)

    // 头轮廓（更圆润）
    ctx.beginPath()
    ctx.moveTo(-42, -5)
    ctx.quadraticCurveTo(-45, -45, -20, -55)
    ctx.quadraticCurveTo(0, -60, 20, -55)
    ctx.quadraticCurveTo(45, -45, 42, -5)
    ctx.quadraticCurveTo(44, 22, 24, 36)
    ctx.quadraticCurveTo(0, 44, -24, 36)
    ctx.quadraticCurveTo(-44, 22, -42, -5)
    ctx.closePath()
    ctx.fillStyle = COLORS.fur
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 面部白色面具（更像哈士奇）
    ctx.beginPath()
    ctx.moveTo(-30, -22)
    ctx.quadraticCurveTo(-20, -52, 0, -50)
    ctx.quadraticCurveTo(20, -52, 30, -22)
    ctx.quadraticCurveTo(26, -5, 18, 6)
    ctx.quadraticCurveTo(12, 18, 0, 22)
    ctx.quadraticCurveTo(-12, 18, -18, 6)
    ctx.quadraticCurveTo(-26, -5, -30, -22)
    ctx.closePath()
    ctx.fillStyle = COLORS.white
    ctx.fill()

    // 眼睛上方的深色"眉毛"区域（哈士奇特征）
    ctx.beginPath()
    ctx.moveTo(-28, -25)
    ctx.quadraticCurveTo(-16, -30, -6, -22)
    ctx.quadraticCurveTo(-14, -16, -26, -14)
    ctx.closePath()
    ctx.fillStyle = 'rgba(74,93,122,0.25)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(28, -25)
    ctx.quadraticCurveTo(16, -30, 6, -22)
    ctx.quadraticCurveTo(14, -16, 26, -14)
    ctx.closePath()
    ctx.fillStyle = 'rgba(74,93,122,0.25)'
    ctx.fill()

    // 眼睛
    drawEye(-17, -10, eyeOpen)
    drawEye(17, -10, eyeOpen)

    // 腮红
    ctx.beginPath()
    ctx.ellipse(-26, 8, 6, 3.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,143,163,0.25)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(26, 8, 6, 3.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,143,163,0.25)'
    ctx.fill()

    // 鼻子
    ctx.beginPath()
    ctx.ellipse(0, 6, 7, 5.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.nose
    ctx.fill()
    // 鼻子高光
    ctx.beginPath()
    ctx.ellipse(-2, 3, 2, 1.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()

    // 人中到嘴巴的线条
    ctx.beginPath()
    ctx.moveTo(0, 12)
    ctx.lineTo(0, 18)
    ctx.strokeStyle = 'rgba(47,63,82,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 嘴巴
    drawMouth(mouthOpen, tongueOut)

    ctx.restore()
  }

  function drawEar (x, y, angle) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    // 耳朵外轮廓（更三角形）
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-16, -32, -6, -48)
    ctx.quadraticCurveTo(2, -54, 12, -46)
    ctx.quadraticCurveTo(22, -32, 10, 0)
    ctx.closePath()

    const grad = ctx.createLinearGradient(0, 0, 0, -48)
    grad.addColorStop(0, COLORS.fur)
    grad.addColorStop(0.5, COLORS.fur)
    grad.addColorStop(1, COLORS.furDark)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 耳内粉
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.quadraticCurveTo(-9, -26, -2, -38)
    ctx.quadraticCurveTo(5, -38, 9, -26)
    ctx.quadraticCurveTo(8, -14, 0, -6)
    ctx.closePath()
    ctx.fillStyle = '#f0c8d4'
    ctx.fill()

    ctx.restore()
  }

  function drawEye (x, y, open) {
    ctx.save()
    ctx.translate(x, y)

    if (open <= 0.2) {
      // 闭眼
      ctx.beginPath()
      ctx.moveTo(-9, 2)
      ctx.quadraticCurveTo(0, 6, 9, 2)
      ctx.strokeStyle = COLORS.furDark
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.restore()
      return
    }

    const eyeScale = Math.max(0.3, open)
    ctx.scale(1, eyeScale)

    // 眼白（杏仁形）
    ctx.beginPath()
    ctx.moveTo(-11, 0)
    ctx.quadraticCurveTo(-11, -10, 0, -12)
    ctx.quadraticCurveTo(11, -10, 11, 0)
    ctx.quadraticCurveTo(11, 10, 0, 11)
    ctx.quadraticCurveTo(-11, 10, -11, 0)
    ctx.closePath()
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 1.2
    ctx.strokeStyle = COLORS.furDark
    ctx.stroke()

    // 虹膜（冰蓝色渐变）
    const irisGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 7)
    irisGrad.addColorStop(0, '#7ed0ff')
    irisGrad.addColorStop(0.6, '#3ba3f5')
    irisGrad.addColorStop(1, '#1a7bc8')
    ctx.beginPath()
    ctx.ellipse(0, 0, 7, 7.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = irisGrad
    ctx.fill()

    // 瞳孔
    ctx.beginPath()
    ctx.ellipse(0, 0.5, 3.8, 4.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.pupil
    ctx.fill()

    // 高光
    ctx.beginPath()
    ctx.ellipse(2.5, -3, 2.2, 2.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(-2.5, 2.5, 1.2, 1.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fill()

    ctx.restore()
  }

  function drawMouth (open, tongueOut) {
    ctx.save()
    ctx.translate(0, 20)

    if (open <= 0.05) {
      // 微笑闭合
      ctx.beginPath()
      ctx.moveTo(-11, -3)
      ctx.quadraticCurveTo(0, 5, 11, -3)
      ctx.strokeStyle = COLORS.furDark
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      // 张嘴
      const h = open * 16
      ctx.beginPath()
      ctx.moveTo(-13, -2)
      ctx.quadraticCurveTo(-7, h, 0, h + 2)
      ctx.quadraticCurveTo(7, h, 13, -2)
      ctx.quadraticCurveTo(0, 7, -13, -2)
      ctx.closePath()
      ctx.fillStyle = '#2a1a1a'
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = COLORS.furDark
      ctx.stroke()

      // 舌头
      if (tongueOut > 0) {
        const th = tongueOut * 12
        ctx.beginPath()
        ctx.ellipse(0, h - 1 + th / 2, 6, th / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = COLORS.tongue
        ctx.fill()
        ctx.strokeStyle = '#d66a80'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  function drawReactionText () {
    const progress = husky.reactionTimer / 1.2
    const alpha = 1 - progress
    const yOffset = -progress * 25

    ctx.save()
    ctx.translate(0, -115 + yOffset)
    ctx.globalAlpha = alpha

    // 气泡背景
    const text = husky.reactionText
    ctx.font = 'bold 18px system-ui, sans-serif'
    const metrics = ctx.measureText(text)
    const padding = 8
    const bubbleW = metrics.width + padding * 2
    const bubbleH = 28

    ctx.beginPath()
    ctx.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 8)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(74,93,122,0.3)'
    ctx.stroke()

    // 小三角
    ctx.beginPath()
    ctx.moveTo(-6, bubbleH / 2)
    ctx.lineTo(0, bubbleH / 2 + 6)
    ctx.lineTo(6, bubbleH / 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()
    ctx.stroke()

    // 文字
    ctx.fillStyle = '#2f3f52'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)

    ctx.restore()
  }

  function wrapText (ctx, text, maxWidth) {
    const chars = String(text).split('')
    const lines = []
    let line = ''
    chars.forEach(function (ch) {
      const testLine = line + ch
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line)
        line = ch
      } else {
        line = testLine
      }
    })
    if (line) lines.push(line)
    return lines
  }

  function drawReminderText () {
    const progress = reminder.timer / reminder.duration
    const alpha = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1
    const yOffset = -Math.sin(progress * Math.PI) * 10

    ctx.save()
    ctx.translate(0, -135 + yOffset)
    ctx.globalAlpha = Math.max(0, alpha)

    const text = reminder.text
    ctx.font = 'bold 17px system-ui, sans-serif'
    const maxW = 150
    const lines = wrapText(ctx, text, maxW)
    const lineHeight = 22
    const padding = 10
    const maxLineWidth = lines.reduce(function (max, line) {
      return Math.max(max, ctx.measureText(line).width)
    }, 0)
    const bubbleW = Math.min(210, Math.max(120, maxLineWidth + padding * 2))
    const bubbleH = padding * 2 + lines.length * lineHeight

    // 提醒气泡背景（暖黄色）
    ctx.beginPath()
    ctx.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 10)
    ctx.fillStyle = 'rgba(255, 243, 205, 0.98)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 167, 38, 0.9)'
    ctx.stroke()

    // 小三角
    ctx.beginPath()
    ctx.moveTo(-7, bubbleH / 2)
    ctx.lineTo(0, bubbleH / 2 + 8)
    ctx.lineTo(7, bubbleH / 2)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 243, 205, 0.98)'
    ctx.fill()
    ctx.stroke()

    // 文字
    ctx.fillStyle = '#5d4037'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach(function (line, index) {
      ctx.fillText(line, 0, -bubbleH / 2 + padding + lineHeight / 2 + index * lineHeight)
    })

    ctx.restore()
  }

  // ========== 启动 ==========

  init()
})()
