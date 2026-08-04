import type { PetConfig, PetState, ScreenBounds, ScreenPoint } from '../../shared/types'
import { clampToBounds, fallbackBounds, randomTarget, stepToward } from './motion'

/** 行走基础速度（像素/秒），乘以配置的 speed 倍率 */
const WALK_SPEED = 90
/** 跟随鼠标的最小触发距离（窗口中心到光标） */
const FOLLOW_DISTANCE = 90
/** remind 状态持续秒数 */
const REMIND_DURATION = 3

export interface MachineEnv {
  /** 全局光标位置（主进程轮询提供），无则 null */
  cursor: ScreenPoint | null
  /** 光标所在显示器的工作区（多显示器适配） */
  bounds: ScreenBounds
  /** 鼠标最近在宠物上有活动（用于唤醒睡眠） */
  mouseActive: boolean
  /** 鼠标当前按住 */
  mouseDown: boolean
}

/**
 * 宠物状态机（移植自旧版 public/pet.js，渲染改为序列帧）
 * idle / wander(walk) / follow / sit / sleep / look 自主循环
 * jump / bark / happy / remind 为事件触发的一次性状态
 */
export class PetStateMachine {
  state: PetState = 'idle'
  stateTime = 0
  /** 窗口左上角屏幕坐标 */
  winX = 0
  winY = 0
  /** 朝向：1 朝右，-1 朝左 */
  facing = 1
  /** 点击反馈循环索引（跳 → 叫 → 坐） */
  reactionIndex = 0
  /** 窗口（画布）边长，随 petScale 变化 */
  viewSize: number

  private targetX: number | null = null
  private targetY: number | null = null
  private jumpVelocity = 0
  private barkTimer = 0
  private nextStateChange = 2 + Math.random() * 3
  private bounds: ScreenBounds = fallbackBounds()

  /** 跳跃的垂直偏移（供渲染层使用） */
  jumpY = 0

  constructor (
    private config: PetConfig,
    viewSize: number,
    private moveWindow: (x: number, y: number) => void
  ) {
    this.viewSize = viewSize
  }

  setViewSize (viewSize: number): void {
    this.viewSize = viewSize
  }

  updateConfig (config: PetConfig): void {
    const prevDefault = this.config.defaultState
    this.config = config
    if (config.defaultState !== prevDefault) {
      if (config.defaultState === 'sleep') this.setState('sleep', true)
      else if (config.defaultState === 'sit') this.setState('sit', true)
      else this.setState('idle')
    }
  }

  /**
   * 切换状态。
   * persistentRest：主动安排的休息（默认状态=坐下/睡觉、右键菜单指令），
   * 一直保持到被点击或提醒触发；自主的坐/睡则是几秒后自动结束的小憩。
   */
  private persistentRest = false

  setState (state: PetState, persistentRest = false): void {
    if (this.state !== state) {
      this.state = state
    }
    this.stateTime = 0
    this.jumpY = 0
    this.barkTimer = 0
    this.persistentRest = (state === 'sleep' || state === 'sit') && persistentRest

    if (state === 'idle') {
      this.nextStateChange = 2 + Math.random() * 3
    } else if (state === 'sit') {
      this.nextStateChange = 3 + Math.random() * 4
    } else if (state === 'sleep') {
      this.nextStateChange = 6 + Math.random() * 8
    }
  }

  /** 点击反馈：睡觉则醒来，否则循环 跳 → 叫 → 坐 */
  triggerClickReaction (): string {
    if (this.state === 'sleep') {
      this.setState('idle')
      return '早~'
    }
    const reactions: Array<{ state: PetState; text: string }> = [
      { state: 'jump', text: '嘿！' },
      { state: 'bark', text: '汪！' },
      { state: 'sit', text: '乖巧' }
    ]
    const reaction = reactions[this.reactionIndex % reactions.length]
    this.reactionIndex += 1

    if (reaction.state === 'jump') {
      this.setState('jump')
      this.jumpVelocity = -340
      this.jumpY = 0
    } else if (reaction.state === 'bark') {
      this.setState('bark')
      this.barkTimer = 0
    } else {
      this.setState('sit')
    }
    return reaction.text
  }

  /** 提醒触发：跳到提醒状态（优先级最高） */
  triggerReminder (): void {
    this.setState('remind')
    this.jumpVelocity = -360
    this.jumpY = 0
  }

  startDrag (): void {
    this.setState('drag')
  }

  update (deltaSec: number, env: MachineEnv): void {
    this.stateTime += deltaSec
    this.bounds = env.bounds

    // 跳跃重力（jump 与 remind 共用）
    if (this.state === 'jump' || this.state === 'remind') {
      if (this.jumpVelocity !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVelocity * deltaSec
        this.jumpVelocity += 1000 * deltaSec
        if (this.jumpY >= 0) {
          this.jumpY = 0
          this.jumpVelocity = 0
          if (this.state === 'jump') this.setState('idle')
        }
      }
      if (this.state === 'remind' && this.stateTime > REMIND_DURATION) {
        this.setState('idle')
      }
      return
    }

    if (this.state === 'drag') {
      if (!env.mouseDown) this.setState('idle')
      return
    }

    // 小憩（非主动安排的睡眠）被鼠标活动唤醒
    if (this.state === 'sleep' && !this.persistentRest && env.mouseActive) {
      this.setState('idle')
      return
    }

    if (this.state === 'bark') {
      this.barkTimer += deltaSec
      if (this.barkTimer > 0.45) this.setState('idle')
      return
    }

    // 跟随鼠标（使用全局光标）
    if (this.config.followMouse && env.cursor) {
      const centerX = this.winX + this.viewSize / 2
      const centerY = this.winY + this.viewSize / 2
      const dist = Math.hypot(env.cursor.x - centerX, env.cursor.y - centerY)

      if (dist > FOLLOW_DISTANCE) {
        this.targetX = env.cursor.x - this.viewSize / 2
        this.targetY = env.cursor.y - this.viewSize / 2
        if (this.state !== 'walk') this.setState('walk')
        this.moveTowardTarget(deltaSec)
        return
      }
      if (this.state !== 'look' && this.state !== 'sit' && this.state !== 'sleep') {
        this.setState('look')
      }
    }

    if (this.state === 'walk') {
      this.moveTowardTarget(deltaSec)
      return
    }

    if (this.state === 'look') {
      if (env.cursor) {
        this.facing = env.cursor.x > this.winX + this.viewSize / 2 ? 1 : -1
      }
      if (this.stateTime > 3) this.setState('idle')
      return
    }

    if (this.state === 'sit' || this.state === 'sleep') {
      // 主动安排的休息不超时，直到被点击或提醒唤醒
      if (!this.persistentRest && this.stateTime > this.nextStateChange) {
        this.setState('idle')
      }
      return
    }

    // idle：到点随机选择下一个自主行为
    if (this.state === 'idle' && this.stateTime > this.nextStateChange) {
      this.pickAutonomousState()
    }
  }

  private pickAutonomousState (): void {
    const r = Math.random()
    if (this.config.allowSleep && r < 0.18) {
      this.setState('sleep')
    } else if (r < 0.45) {
      this.setState('sit')
    } else if (r < 0.75) {
      const target = randomTarget(this.viewSize, this.bounds)
      this.targetX = target.x
      this.targetY = target.y
      this.setState('walk')
    } else {
      this.setState('idle')
      this.nextStateChange = 2 + Math.random() * 2
    }
  }

  private moveTowardTarget (deltaSec: number): void {
    if (this.targetX === null || this.targetY === null) {
      this.setState('idle')
      return
    }
    const target = clampToBounds(this.targetX, this.targetY, this.viewSize, this.bounds)
    this.targetX = target.x
    this.targetY = target.y

    if (this.targetX > this.winX + 1) this.facing = 1
    else if (this.targetX < this.winX - 1) this.facing = -1

    const speed = WALK_SPEED * this.config.speed
    const { pos, arrived } = stepToward(
      { x: this.winX, y: this.winY },
      target,
      speed * deltaSec
    )
    this.winX = Math.round(pos.x)
    this.winY = Math.round(pos.y)
    this.moveWindow(this.winX, this.winY)

    if (arrived) {
      this.targetX = null
      this.targetY = null
      this.setState('idle')
    }
  }
}
