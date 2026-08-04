import { DEFAULT_PET_CONFIG, type PetConfig } from '../../shared/types'
import {
  drawReactionText,
  drawReminderBubble,
  drawSleepZzz,
  pointInRect,
  reminderBubbleLayout
} from './bubble'
import { bindInput } from './input'
import { fallbackBounds } from './motion'
import { PetStateMachine } from './states'
import { SpritePlayer, type SpriteFx } from './sprite'

/** 反应文字展示时长（秒） */
const REACTION_SEC = 1
/** 稍后提醒的分钟数 */
const SNOOZE_MINUTES = 10
/** 宠物位置记忆（localStorage） */
const POSITION_KEY = 'pet-position'
/** 睡觉时的渲染帧间隔（秒），省电 */
const SLEEP_FRAME_INTERVAL = 0.1

const TAU = Math.PI * 2

/** 各状态的程序化动效（正式多帧素材就位后仍保留，叠加在帧动画上） */
function computeFx (state: string, phase: number): SpriteFx {
  switch (state) {
    case 'idle':
      // 呼吸
      return { scaleY: 1 + 0.025 * Math.sin((TAU * phase) / 2.2) }
    case 'look':
      return { scaleY: 1 + 0.02 * Math.sin((TAU * phase) / 2.2) }
    case 'sit':
      return { scaleY: 1 + 0.018 * Math.sin((TAU * phase) / 2.6) }
    case 'sleep':
      // 更缓慢的呼吸
      return { scaleY: 1 + 0.02 * Math.sin((TAU * phase) / 3.4) }
    case 'walk': {
      // 拟人步伐：身体前倾 + 左右摇摆（鸭子步）+ 挤压拉伸模拟腿部发力
      const step = Math.sin((TAU * phase) / 0.45)
      return {
        offsetY: -Math.abs(step) * 5,
        rotationDeg: step * 6 + 4,
        scaleX: 1 + 0.04 * Math.cos((TAU * phase) / 0.45),
        scaleY: 1 - 0.02 * Math.cos((TAU * phase) / 0.45)
      }
    }
    case 'drag':
      // 被拎着摇晃
      return { rotationDeg: Math.sin((TAU * phase) / 0.9) * 8 }
    case 'remind':
      // 兴奋弹跳
      return { scaleY: 1 + 0.06 * Math.abs(Math.sin((TAU * phase) / 0.6)) }
    case 'happy':
    case 'bark':
      return { scaleY: 1 + 0.04 * Math.abs(Math.sin((TAU * phase) / 0.5)) }
    default:
      return {}
  }
}

function loadSavedPosition (bounds: { x: number; y: number; width: number; height: number }, size: number): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const pos = JSON.parse(raw)
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return null
    // 校验在当前屏幕范围内，避免换显示器后宠物丢到屏幕外
    if (
      pos.x < bounds.x - size / 2 ||
      pos.y < bounds.y ||
      pos.x > bounds.x + bounds.width - size / 2 ||
      pos.y > bounds.y + bounds.height - size / 2
    ) {
      return null
    }
    return pos
  } catch {
    return null
  }
}

const canvas = document.getElementById('petCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

let config: PetConfig = { ...DEFAULT_PET_CONFIG }
/** 画布边长（CSS 像素），跟随窗口大小（petScale） */
let viewSize = Math.min(window.innerWidth, window.innerHeight)

const player = new SpritePlayer()
// 位置记忆：moveWindow 回调里节流保存
let lastPosSave = 0
function savePosition (x: number, y: number, force = false): void {
  const now = Date.now()
  if (!force && now - lastPosSave < 2000) return
  lastPosSave = now
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y }))
  } catch {
    // ignore
  }
}

const machine = new PetStateMachine(config, viewSize, (x, y) => {
  window.petApi.setPosition(x, y)
  savePosition(x, y)
})

// 提醒气泡
let reminder: { title: string; sticky: boolean } | null = null
let reminderTimer = 0
// 反应文字
let reactionText: string | null = null
let reactionTimer = 0
// 鼠标活动（唤醒睡眠用）
let mouseActive = false
let mouseActiveTimer: ReturnType<typeof setTimeout> | null = null
// 睡眠动画相位
let sleepPhase = 0

function resize (): void {
  viewSize = Math.min(window.innerWidth, window.innerHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(viewSize * dpr)
  canvas.height = Math.floor(viewSize * dpr)
  canvas.style.width = `${viewSize}px`
  canvas.style.height = `${viewSize}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  machine.setViewSize(viewSize)
}

function markMouseActive (): void {
  mouseActive = true
  if (mouseActiveTimer) clearTimeout(mouseActiveTimer)
  mouseActiveTimer = setTimeout(() => {
    mouseActive = false
  }, 800)
}

/** 提醒提示音：两声短促的“汪汪”式提示（WebAudio 合成，无需音频素材） */
let audioCtx: AudioContext | null = null

async function playReminderSound (): Promise<void> {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext()
    }
    const actx = audioCtx
    // 自动播放策略下上下文可能处于 suspended，必须等 resume 完成再排程
    if (actx.state === 'suspended') {
      await actx.resume()
    }
    if (actx.state !== 'running') {
      console.warn('[pet] AudioContext 未就绪:', actx.state)
      return
    }
    const start = actx.currentTime + 0.05
    ;[880, 660].forEach((freq, i) => {
      const osc = actx.createOscillator()
      const gain = actx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = start + i * 0.18
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(actx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    })
    console.log('[pet] 提示音已播放, state =', actx.state)
  } catch (err) {
    console.warn('[pet] 提示音播放失败', err)
  }
}

async function init (): Promise<void> {
  resize()
  window.addEventListener('resize', resize)

  // 先注册配置监听，再主动拉取初始配置
  // （主进程在 ready-to-show 时推送的配置可能早于页面 JS 注册监听而丢失）
  window.petApi.onConfig((newConfig) => {
    config = { ...config, ...newConfig }
    machine.updateConfig(config)
  })
  try {
    const initialConfig = await window.petApi.getConfig()
    config = { ...config, ...initialConfig }
    machine.updateConfig(config)
  } catch (err) {
    console.warn('[pet] 拉取初始配置失败，使用默认值', err)
  }

  await player.load()

  // 初始位置：优先上次保存的位置（校验在屏幕内），否则右下角
  const bounds = fallbackBounds()
  const saved = loadSavedPosition(bounds, viewSize)
  machine.winX = saved?.x ?? Math.max(bounds.x, bounds.x + bounds.width - viewSize - 60)
  machine.winY = saved?.y ?? Math.max(bounds.y, bounds.y + bounds.height - viewSize - 80)
  window.petApi.setPosition(machine.winX, machine.winY)

  machine.setState(
    config.defaultState === 'sleep'
      ? 'sleep'
      : config.defaultState === 'sit'
        ? 'sit'
        : 'idle'
  )

  window.petApi.onReminder(({ title, sticky }) => {
    reminder = { title, sticky }
    reminderTimer = 0
    machine.triggerReminder()
    if (config.reminderSound) void playReminderSound()
  })

  // 右键菜单（主进程弹出系统菜单）
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    window.petApi.showContextMenu()
  })
  window.petApi.onCommand((cmd) => {
    if (cmd === 'sit' || cmd === 'sleep') {
      machine.setState(cmd)
    }
  })

  // 页面隐藏前强制保存位置
  window.addEventListener('pagehide', () => {
    savePosition(machine.winX, machine.winY, true)
  })

  const input = bindInput(canvas, {
    onDragStart: (offsetX, offsetY) => {
      machine.startDrag()
      window.petApi.startDrag(offsetX, offsetY)
    },
    onDragEnd: () => {
      window.petApi.endDrag()
      savePosition(machine.winX, machine.winY, true)
      machine.setState('idle')
    },
    onClick: (x, y) => {
      // 提醒气泡显示中：优先处理气泡按钮
      if (reminder) {
        const layout = reminderBubbleLayout(ctx, reminder.title, viewSize)
        if (pointInRect(x, y, layout.snooze)) {
          window.petApi.snoozeReminder(reminder.title, SNOOZE_MINUTES)
          reminder = null
          return
        }
        if (pointInRect(x, y, layout.dismiss) || pointInRect(x, y, layout.bubble)) {
          reminder = null
          return
        }
      }
      if (config.clickFeedback) {
        reactionText = machine.triggerClickReaction()
        reactionTimer = 0
      }
    },
    onActivity: markMouseActive
  })

  let lastTime = performance.now()
  let fxPhase = 0
  // 省电：睡觉时节流到 ~10fps（累计满间隔才做一次更新+绘制）
  let sleepFrameAcc = 0
  function animate (now: number): void {
    const rawDelta = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

    // 睡眠节流：跳过中间帧，但保留时间累计
    if (machine.state === 'sleep' && sleepFrameAcc < SLEEP_FRAME_INTERVAL) {
      sleepFrameAcc += rawDelta
      requestAnimationFrame(animate)
      return
    }
    const deltaSec = machine.state === 'sleep' ? sleepFrameAcc : rawDelta
    sleepFrameAcc = 0
    fxPhase += deltaSec

    const cursorInfo = window.petApi.getCursorInfo()
    machine.update(deltaSec, {
      cursor: config.followMouse ? cursorInfo : null,
      bounds: cursorInfo?.bounds ?? fallbackBounds(),
      mouseActive,
      mouseDown: input.isMouseDown()
    })

    player.play(machine.state)
    player.update(deltaSec)

    // ---- 绘制 ----
    ctx.clearRect(0, 0, viewSize, viewSize)
    ctx.save()
    ctx.translate(0, machine.jumpY)
    player.draw(ctx, viewSize, machine.facing === -1, computeFx(machine.state, fxPhase))
    ctx.restore()

    if (machine.state === 'sleep') {
      sleepPhase += deltaSec
      drawSleepZzz(ctx, viewSize, sleepPhase)
    }

    if (reactionText) {
      reactionTimer += deltaSec
      if (reactionTimer > REACTION_SEC) {
        reactionText = null
      } else {
        drawReactionText(ctx, reactionText, viewSize, reactionTimer / REACTION_SEC)
      }
    }

    if (reminder) {
      reminderTimer += deltaSec
      // sticky（重要提醒）或 bubbleDuration=0：不自动消失，需点击确认
      const autoDismiss =
        !reminder.sticky && config.bubbleDuration > 0 && reminderTimer > config.bubbleDuration
      if (autoDismiss) {
        reminder = null
      } else {
        drawReminderBubble(ctx, reminderBubbleLayout(ctx, reminder.title, viewSize), viewSize)
      }
    }

    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

init().catch((err) => console.error('[pet] init failed', err))
