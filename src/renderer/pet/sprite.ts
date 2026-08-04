import type { SpriteManifest, SpriteStateEntry } from '../../shared/types'

/** sprites 目录相对 pet/index.html 的路径（dev 与打包后均成立） */
const SPRITES_BASE = '../sprites/'
const FALLBACK_STATE = 'idle'

interface ResolvedEntry {
  entry: SpriteStateEntry
  images: HTMLImageElement[]
}

/**
 * 序列帧播放器
 * 素材规范：sprites/<state>/000.png… 透明底帧图，manifest.json 声明 fps / loop
 */
export class SpritePlayer {
  private manifest: SpriteManifest = { states: {} }
  private images = new Map<string, HTMLImageElement>()
  private state = FALLBACK_STATE
  private frameIndex = 0
  private frameTime = 0

  async load (): Promise<void> {
    const res = await fetch(`${SPRITES_BASE}manifest.json`)
    this.manifest = (await res.json()) as SpriteManifest

    const paths = new Set<string>()
    for (const entry of Object.values(this.manifest.states)) {
      for (const frame of entry.frames) paths.add(frame)
    }
    await Promise.all([...paths].map((p) => this.loadImage(p)))
  }

  private loadImage (framePath: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        this.images.set(framePath, img)
        resolve()
      }
      img.onerror = () => {
        console.warn('[sprite] 帧加载失败:', framePath)
        resolve()
      }
      img.src = `${SPRITES_BASE}${framePath}`
    })
  }

  /** 切换状态；未定义的状态回退到 idle */
  play (state: string): void {
    if (state === this.state) return
    this.state = state
    this.frameIndex = 0
    this.frameTime = 0
  }

  currentState (): string {
    return this.state
  }

  private resolve (state: string): ResolvedEntry | null {
    const entry =
      this.manifest.states[state] ?? this.manifest.states[FALLBACK_STATE]
    if (!entry || entry.frames.length === 0) return null
    const images = entry.frames
      .map((f) => this.images.get(f))
      .filter((img): img is HTMLImageElement => img !== undefined)
    if (images.length === 0) return null
    return { entry, images }
  }

  /** 按 fps 推进帧；loop=false 时停在最后一帧 */
  update (deltaSec: number): void {
    const resolved = this.resolve(this.state)
    if (!resolved || resolved.images.length <= 1) return

    this.frameTime += deltaSec
    const frameDuration = 1 / Math.max(resolved.entry.fps, 0.1)
    while (this.frameTime >= frameDuration) {
      this.frameTime -= frameDuration
      if (this.frameIndex < resolved.images.length - 1) {
        this.frameIndex += 1
      } else if (resolved.entry.loop) {
        this.frameIndex = 0
      }
    }
  }

  /** 底部对齐、等比缩放绘制；flip 水平翻转（用于朝向） */
  draw (
    ctx: CanvasRenderingContext2D,
    boxSize: number,
    flip: boolean
  ): void {
    const resolved = this.resolve(this.state)
    if (!resolved) return
    const img = resolved.images[Math.min(this.frameIndex, resolved.images.length - 1)]

    const scale = Math.min(boxSize / img.width, boxSize / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = (boxSize - w) / 2
    const y = boxSize - h

    ctx.save()
    if (flip) {
      ctx.translate(boxSize, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, boxSize - x - w, y, w, h)
    } else {
      ctx.drawImage(img, x, y, w, h)
    }
    ctx.restore()
  }
}
