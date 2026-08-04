/**
 * Canvas 气泡绘制：提醒气泡（白色圆角矩形 + 小尾巴）与简短反应文字
 */

const PADDING_X = 10
const PADDING_Y = 6
const LINE_HEIGHT = 16
const MAX_WIDTH = 180
const TAIL = 6

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

/** 在宠物头顶绘制提醒气泡，返回气泡占用高度 */
export function drawBubble (
  ctx: CanvasRenderingContext2D,
  text: string,
  boxSize: number
): void {
  ctx.save()
  ctx.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'

  const lines = wrapText(ctx, text, MAX_WIDTH - PADDING_X * 2).slice(0, 4)
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const w = Math.min(textWidth + PADDING_X * 2, MAX_WIDTH)
  const h = lines.length * LINE_HEIGHT + PADDING_Y * 2
  const x = Math.max(2, Math.min((boxSize - w) / 2, boxSize - w - 2))
  const y = 4

  // 气泡体
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.lineWidth = 1
  roundRectPath(ctx, x, y, w, h, 8)
  ctx.fill()
  ctx.stroke()

  // 小尾巴
  const tailX = boxSize / 2
  ctx.beginPath()
  ctx.moveTo(tailX - TAIL, y + h - 1)
  ctx.lineTo(tailX, y + h + TAIL)
  ctx.lineTo(tailX + TAIL, y + h - 1)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fill()

  // 文字
  ctx.fillStyle = '#222'
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, x + PADDING_X, y + PADDING_Y + i * LINE_HEIGHT)
  })
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
