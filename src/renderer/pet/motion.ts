import type { ScreenBounds } from '../../shared/types'

/** 位移与边界计算（闲逛 / 跟随鼠标共用） */

export interface Vec2 {
  x: number
  y: number
}

/** 当前窗口所在屏幕的可用区域（bounds 缺失时的兜底） */
export function fallbackBounds (): ScreenBounds {
  return {
    x: 0,
    y: 0,
    width: window.screen.availWidth,
    height: window.screen.availHeight
  }
}

/** 限制窗口左上角在指定屏幕区域内 */
export function clampToBounds (
  x: number,
  y: number,
  size: number,
  bounds: ScreenBounds
): Vec2 {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - size, x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - size, y))
  }
}

/** 朝目标移动一步，返回新位置与是否到达 */
export function stepToward (
  from: Vec2,
  to: Vec2,
  maxStep: number
): { pos: Vec2; arrived: boolean } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist <= maxStep || dist < 1) {
    return { pos: { ...to }, arrived: true }
  }
  const ratio = maxStep / dist
  return {
    pos: { x: from.x + dx * ratio, y: from.y + dy * ratio },
    arrived: false
  }
}

/** 屏幕区域内随机目标点 */
export function randomTarget (size: number, bounds: ScreenBounds): Vec2 {
  return {
    x: bounds.x + Math.random() * Math.max(0, bounds.width - size),
    y: bounds.y + Math.random() * Math.max(0, bounds.height - size)
  }
}
