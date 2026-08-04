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
  /** 宠物大小倍率 0.5 ~ 2 */
  petScale: number
  /** 提醒气泡展示时长（秒）；0 = 不自动消失 */
  bubbleDuration: number
  /** 鼠标穿透（宠物不响应任何交互，纯观赏） */
  clickThrough: boolean
  /** 提醒提示音 */
  reminderSound: boolean
  /** 开机自启动 */
  autoStart: boolean
}

export const DEFAULT_PET_CONFIG: PetConfig = {
  followMouse: true,
  allowSleep: true,
  clickFeedback: true,
  speed: 1,
  defaultState: 'idle',
  showOnStartup: true,
  petScale: 1,
  bubbleDuration: 8,
  clickThrough: false,
  reminderSound: true,
  autoStart: false
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
  /** 重要提醒：气泡不自动消失，需点击确认 */
  sticky?: boolean
  /** 内部临时任务（如稍后提醒），不在面板列表显示 */
  transient?: boolean
}

/** 屏幕区域 */
export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

/** 主进程轮询发送的光标信息（含光标所在显示器的工作区） */
export interface CursorInfo {
  x: number
  y: number
  bounds: ScreenBounds
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
