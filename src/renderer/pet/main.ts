import { DEFAULT_PET_CONFIG, type PetConfig } from '../../shared/types'
import { drawBubble, drawReactionText, drawSleepZzz } from './bubble'
import { bindInput } from './input'
import { PetStateMachine } from './states'
import { SpritePlayer } from './sprite'

/** 逻辑画布尺寸（CSS 像素），与主进程宠物窗口尺寸一致 */
const LOGICAL_SIZE = 220
/** 提醒气泡展示时长（秒） */
const REMINDER_BUBBLE_SEC = 8
/** 反应文字展示时长（秒） */
const REACTION_SEC = 1

const canvas = document.getElementById('petCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

let config: PetConfig = { ...DEFAULT_PET_CONFIG }
const player = new SpritePlayer()
const machine = new PetStateMachine(config, LOGICAL_SIZE, (x, y) => {
  window.petApi.setPosition(x, y)
})

// 提醒气泡
let reminderText: string | null = null
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(LOGICAL_SIZE * dpr)
  canvas.height = Math.floor(LOGICAL_SIZE * dpr)
  canvas.style.width = `${LOGICAL_SIZE}px`
  canvas.style.height = `${LOGICAL_SIZE}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function markMouseActive (): void {
  mouseActive = true
  if (mouseActiveTimer) clearTimeout(mouseActiveTimer)
  mouseActiveTimer = setTimeout(() => {
    mouseActive = false
  }, 800)
}

async function init (): Promise<void> {
  resize()
  window.addEventListener('resize', resize)

  await player.load()

  // 初始位置：屏幕右下角
  machine.winX = Math.max(0, window.screen.availWidth - LOGICAL_SIZE - 60)
  machine.winY = Math.max(0, window.screen.availHeight - LOGICAL_SIZE - 80)
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

  window.petApi.onReminder(({ title }) => {
    reminderText = title
    reminderTimer = 0
    machine.triggerReminder()
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
    onClick: () => {
      // 点击提醒气泡立即关闭
      if (reminderText) {
        reminderText = null
        return
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

    const cursor = window.petApi.getCursorScreenPoint()
    machine.update(deltaSec, {
      cursor: config.followMouse ? cursor : null,
      mouseActive,
      mouseDown: input.isMouseDown()
    })

    player.play(machine.state)
    player.update(deltaSec)

    // ---- 绘制 ----
    ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE)
    ctx.save()
    ctx.translate(0, machine.jumpY)
    player.draw(ctx, LOGICAL_SIZE, machine.facing === -1)
    ctx.restore()

    if (machine.state === 'sleep') {
      sleepPhase += deltaSec
      drawSleepZzz(ctx, LOGICAL_SIZE, sleepPhase)
    }

    if (reactionText) {
      reactionTimer += deltaSec
      if (reactionTimer > REACTION_SEC) {
        reactionText = null
      } else {
        drawReactionText(ctx, reactionText, LOGICAL_SIZE, reactionTimer / REACTION_SEC)
      }
    }

    if (reminderText) {
      reminderTimer += deltaSec
      if (reminderTimer > REMINDER_BUBBLE_SEC) {
        reminderText = null
      } else {
        drawBubble(ctx, reminderText, LOGICAL_SIZE)
      }
    }

    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

init().catch((err) => console.error('[pet] init failed', err))
