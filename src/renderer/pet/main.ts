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
import { SpritePlayer } from './sprite'

/** 反应文字展示时长（秒） */
const REACTION_SEC = 1
/** 稍后提醒的分钟数 */
const SNOOZE_MINUTES = 10

const canvas = document.getElementById('petCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

let config: PetConfig = { ...DEFAULT_PET_CONFIG }
/** 画布边长（CSS 像素），跟随窗口大小（petScale） */
let viewSize = Math.min(window.innerWidth, window.innerHeight)

const player = new SpritePlayer()
const machine = new PetStateMachine(config, viewSize, (x, y) => {
  window.petApi.setPosition(x, y)
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

  await player.load()

  // 初始位置：屏幕右下角
  const bounds = fallbackBounds()
  machine.winX = Math.max(bounds.x, bounds.x + bounds.width - viewSize - 60)
  machine.winY = Math.max(bounds.y, bounds.y + bounds.height - viewSize - 80)
  window.petApi.setPosition(machine.winX, machine.winY)

  machine.setState(
    config.defaultState === 'sleep'
      ? 'sleep'
      : config.defaultState === 'sit'
        ? 'sit'
        : 'idle'
  )

  window.petApi.onConfig((newConfig) => {
    config = { ...config, ...newConfig }
    machine.updateConfig(config)
  })

  window.petApi.onReminder(({ title, sticky }) => {
    reminder = { title, sticky }
    reminderTimer = 0
    machine.triggerReminder()
    if (config.reminderSound) void playReminderSound()
  })

  const input = bindInput(canvas, {
    onDragStart: (offsetX, offsetY) => {
      machine.startDrag()
      window.petApi.startDrag(offsetX, offsetY)
    },
    onDragEnd: () => {
      window.petApi.endDrag()
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
  function animate (now: number): void {
    const deltaSec = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

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
    player.draw(ctx, viewSize, machine.facing === -1)
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
