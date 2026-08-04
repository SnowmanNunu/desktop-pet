/**
 * Canvas 气泡绘制：提醒气泡（标题 + 稍后/知道了按钮）、反应文字、睡眠 Zzz
 * 所有尺寸随窗口大小（boxSize）自适应缩放，宠物缩小时气泡不溢出
 */

/** 设计基准窗口尺寸 */
const BASE_SIZE = 220

/** 气泡缩放系数（相对基准尺寸，限制在 0.6 ~ 1.5） */
function bubbleScale (boxSize: number): number {
  return Math.min(Math.max(boxSize / BASE_SIZE, 0.6), 1.5)
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface BubbleLayout {
  bubble: Rect
  snooze: Rect
  dismiss: Rect
  lines: string[]
  /** 缩放后的绘制参数 */
  font: string
  btnFont: string
  padX: number
  padY: number
  lineHeight: number
  tail: number
  btnRadius: number
}

function roundRectPath (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 按最大宽度折行 */
function wrapText (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line += char
    }
  }
  if (line) lines.push(line)
  return lines
}

export function pointInRect (px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

/** 计算提醒气泡布局（绘制与点击命中共用同一布局，保证一致） */
export function reminderBubbleLayout (
  ctx: CanvasRenderingContext2D,
  text: string,
  boxSize: number
): BubbleLayout {
  const s = bubbleScale(boxSize)
  const padX = 10 * s
  const padY = 6 * s
  const lineHeight = 16 * s
  const maxWidth = Math.min(180 * s, boxSize - 4)
  const btnHeight = 20 * s
  const btnGap = 6 * s
  const font = `${Math.round(13 * s)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
  const btnFont = `${Math.round(11 * s)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`

  ctx.save()
  ctx.font = font
  const lines = wrapText(ctx, text, maxWidth - padX * 2).slice(0, 4)
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width))
  ctx.restore()

  const w = Math.min(Math.max(textWidth + padX * 2, 150 * s), maxWidth)
  const textH = lines.length * lineHeight
  const h = padY * 2 + textH + btnGap + btnHeight
  const x = Math.max(2, Math.min((boxSize - w) / 2, boxSize - w - 2))
  const y = 4

  const btnW = (w - padX * 2 - btnGap) / 2
  const btnY = y + padY + textH + btnGap
  return {
    bubble: { x, y, w, h },
    snooze: { x: x + padX, y: btnY, w: btnW, h: btnHeight },
    dismiss: { x: x + padX + btnW + btnGap, y: btnY, w: btnW, h: btnHeight },
    lines,
    font,
    btnFont,
    padX,
    padY,
    lineHeight,
    tail: 6 * s,
    btnRadius: 6 * s
  }
}

/** 绘制提醒气泡（标题 + [10分钟后再提] [知道了]） */
export function drawReminderBubble (
  ctx: CanvasRenderingContext2D,
  layout: BubbleLayout,
  boxSize: number
): void {
  const { bubble, snooze, dismiss, lines } = layout
  ctx.save()

  // 气泡体
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.lineWidth = 1
  roundRectPath(ctx, bubble.x, bubble.y, bubble.w, bubble.h, 8)
  ctx.fill()
  ctx.stroke()

  // 小尾巴
  const tailX = boxSize / 2
  ctx.beginPath()
  ctx.moveTo(tailX - layout.tail, bubble.y + bubble.h - 1)
  ctx.lineTo(tailX, bubble.y + bubble.h + layout.tail)
  ctx.lineTo(tailX + layout.tail, bubble.y + bubble.h - 1)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fill()

  // 标题文字
  ctx.font = layout.font
  ctx.fillStyle = '#222'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, bubble.x + layout.padX, bubble.y + layout.padY + i * layout.lineHeight)
  })

  // 按钮
  ctx.font = layout.btnFont
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
  roundRectPath(ctx, snooze.x, snooze.y, snooze.w, snooze.h, layout.btnRadius)
  ctx.fill()
  ctx.fillStyle = '#555'
  ctx.fillText('10分钟后再提', snooze.x + snooze.w / 2, snooze.y + snooze.h / 2)

  ctx.fillStyle = '#1976d2'
  roundRectPath(ctx, dismiss.x, dismiss.y, dismiss.w, dismiss.h, layout.btnRadius)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText('知道了', dismiss.x + dismiss.w / 2, dismiss.y + dismiss.h / 2)

  ctx.restore()
}

/** 简短反应文字（"汪！"等），居中浮在头顶 */
export function drawReactionText (
  ctx: CanvasRenderingContext2D,
  text: string,
  boxSize: number,
  progress: number
): void {
  ctx.save()
  ctx.font = 'bold 16px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.globalAlpha = Math.max(0, 1 - progress)
  const y = 30 - progress * 14
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.strokeText(text, boxSize / 2, y)
  ctx.fillStyle = '#e2543a'
  ctx.fillText(text, boxSize / 2, y)
  ctx.restore()
}

/** 睡觉的 Zzz 漂浮动画 */
export function drawSleepZzz (
  ctx: CanvasRenderingContext2D,
  boxSize: number,
  phase: number
): void {
  ctx.save()
  ctx.font = 'bold 14px -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(90, 120, 180, 0.85)'
  ctx.textAlign = 'center'
  for (let i = 0; i < 3; i++) {
    const t = (phase * 0.5 + i * 0.33) % 1
    const x = boxSize * 0.72 + i * 12
    const y = boxSize * 0.3 - t * 30
    ctx.globalAlpha = 1 - t
    ctx.fillText('Z', x, y)
  }
  ctx.restore()
}
