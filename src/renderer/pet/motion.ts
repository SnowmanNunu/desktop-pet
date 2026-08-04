/** 位移与边界计算（闲逛 / 跟随鼠标共用） */

export interface Vec2 {
  x: number
  y: number
}

/** 限制窗口左上角在可用屏幕区域内 */
export function clampToScreen (x: number, y: number, size: number): Vec2 {
  const maxX = Math.max(0, window.screen.availWidth - size)
  const maxY = Math.max(0, window.screen.availHeight - size)
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y))
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

/** 屏幕内随机目标点 */
export function randomTarget (size: number): Vec2 {
  return {
    x: Math.random() * Math.max(0, window.screen.availWidth - size),
    y: Math.random() * Math.max(0, window.screen.availHeight - size)
  }
}
