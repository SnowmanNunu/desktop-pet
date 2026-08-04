/** 宠物行为状态（与 assets/sprites 下的目录名对应） */
export type PetState =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'sleep'
  | 'look'
  | 'drag'
  | 'jump'
  | 'bark'
  | 'happy'
  | 'remind'

/** 宠物配置 */
export interface PetConfig {
  /** 跟随鼠标 */
  followMouse: boolean
  /** 允许自动休眠 */
  allowSleep: boolean
  /** 点击反馈 */
  clickFeedback: boolean
  /** 移动速度倍率 0.5 ~ 2 */
  speed: number
  /** 启动默认状态 */
  defaultState: 'idle' | 'sit' | 'sleep'
  /** 启动时显示宠物 */
  showOnStartup: boolean
}

export const DEFAULT_PET_CONFIG: PetConfig = {
  followMouse: true,
  allowSleep: true,
  clickFeedback: true,
  speed: 1,
  defaultState: 'idle',
  showOnStartup: true
}

/** 提醒任务类型 */
export type ReminderType = 'once' | 'daily' | 'weekly' | 'interval'

/** 提醒任务 */
export interface Reminder {
  id: string
  /** 提醒内容 */
  title: string
  type: ReminderType
  /** once: ISO 日期时间，如 2026-08-04T14:30 */
  datetime?: string
  /** daily / weekly: HH:mm */
  time?: string
  /** weekly: 星期几（0=周日 … 6=周六） */
  weekdays?: number[]
  /** interval: 间隔分钟数 */
  intervalMinutes?: number
  enabled: boolean
  /** 上次触发时间（ISO 字符串） */
  lastFiredAt?: string | null
}

/** 序列帧清单（assets manifest.json） */
export interface SpriteStateEntry {
  /** 帧文件相对 sprites/ 的路径列表 */
  frames: string[]
  fps: number
  loop: boolean
}

export interface SpriteManifest {
  states: Record<string, SpriteStateEntry>
}

export interface ScreenPoint {
  x: number
  y: number
}
