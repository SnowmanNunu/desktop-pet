#!/usr/bin/env node
/**
 * 序列帧素材处理管线
 *
 * 输入：assets/raw/ 下的 AI 生成原图（带背景）
 * 输出：src/renderer/public/sprites/<state>/000.png…（透明底、裁边、≤512px）
 *      + src/renderer/public/sprites/manifest.json
 *
 * 去底优先使用 rembg（tools/.venv 虚拟环境），未安装则回退 sharp 纯色裁边。
 *
 * 批量 AI 生成素材后：把帧图按 sprites/<state>/000.png 命名规范放到
 * assets/frames/<state>/ 下，重新运行本脚本即可重新生成 manifest。
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RAW_DIR = path.join(ROOT, 'assets/raw')
const FRAMES_DIR = path.join(ROOT, 'assets/frames')
const OUT_DIR = path.join(ROOT, 'src/renderer/public/sprites')
const MAX_SIZE = 512
const REMBG_PY = path.join(ROOT, 'tools/.venv/bin/python3')
const REMOVE_BG_SCRIPT = path.join(ROOT, 'tools/remove_bg.py')

// 占位素材：参考图 → 状态映射
const PLACEHOLDER_MAP = {
  'wangcai_angle_front.png': 'idle',
  'wangcai_angle_side.png': 'walk',
  'wangcai_angle_back.png': 'sit',
  'wangcai_angle_silly.png': 'happy'
}

// 无独立素材的状态 → 别名到已有状态的帧
const STATE_ALIASES = {
  sleep: 'idle',
  jump: 'happy',
  bark: 'happy',
  remind: 'happy',
  drag: 'idle'
}

const DEFAULT_FPS = { idle: 2, walk: 8, sit: 2, sleep: 2, happy: 6, jump: 8, bark: 8, remind: 8, drag: 2 }
const NON_LOOP = new Set(['jump', 'bark'])

// 视频素材抽帧配置
const VIDEO_EXTS = ['.mp4', '.mov', '.webm']
const VIDEO_EXTRACT_FPS = 4
const VIDEO_MAX_FRAMES = 8

function hasFfmpeg () {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const hasRembg = fs.existsSync(REMBG_PY)
console.log(hasRembg ? '[sprites] 使用 rembg 去底' : '[sprites] 未检测到 rembg，回退 sharp 裁边（tools/.venv 安装 rembg 可获得更好效果）')

async function removeBackground (inputPath) {
  if (hasRembg) {
    const tmp = inputPath + '.nobg.png'
    // 通过辅助脚本调用 rembg 库 API（CLI 依赖 gradio，在部分环境有兼容问题）
    execFileSync(REMBG_PY, [REMOVE_BG_SCRIPT, inputPath, tmp], { stdio: 'inherit' })
    const buf = fs.readFileSync(tmp)
    fs.unlinkSync(tmp)
    return sharp(buf)
  }
  // 纯色背景回退：trim 掉与四角相近的边缘
  return sharp(inputPath).trim({ threshold: 30 })
}

async function processImage (inputPath, outPath) {
  const pipeline = await removeBackground(inputPath)
  await pipeline
    .trim({ threshold: 10 })
    .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(outPath)
}

async function main () {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const states = {}

  // 1. assets/frames/<state>/ 下的正式帧（批量 AI 生成后放入）
  //    支持 PNG 序列帧，也支持视频（mp4/mov/webm，需 ffmpeg 抽帧）
  if (fs.existsSync(FRAMES_DIR)) {
    for (const state of fs.readdirSync(FRAMES_DIR)) {
      const dir = path.join(FRAMES_DIR, state)
      if (!fs.statSync(dir).isDirectory()) continue

      // 视频素材抽帧（图生视频的工作流）
      const videos = fs
        .readdirSync(dir)
        .filter((f) => VIDEO_EXTS.includes(path.extname(f).toLowerCase()))
      if (videos.length > 0) {
        if (!hasFfmpeg()) {
          console.error('[sprites] 检测到视频素材但未安装 ffmpeg，请先执行：brew install ffmpeg')
          process.exit(1)
        }
        for (const video of videos) {
          const videoPath = path.join(dir, video)
          console.log(`[sprites] ${state}: 抽帧 ${video}`)
          execFileSync(
            'ffmpeg',
            ['-y', '-i', videoPath, '-vf', `fps=${VIDEO_EXTRACT_FPS},scale=1024:-1`, '-frames:v', String(VIDEO_MAX_FRAMES), path.join(dir, `_extracted_%02d.png`)],
            { stdio: 'ignore' }
          )
        }
      }

      const frames = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
      if (frames.length === 0) continue
      const outStateDir = path.join(OUT_DIR, state)
      fs.mkdirSync(outStateDir, { recursive: true })
      const outFrames = []
      for (const [i, frame] of frames.entries()) {
        const name = `${String(i).padStart(3, '0')}.png`
        await processImage(path.join(dir, frame), path.join(outStateDir, name))
        outFrames.push(`${state}/${name}`)
      }
      // 清理抽帧产生的临时文件
      for (const f of frames) {
        if (f.startsWith('_extracted_')) fs.unlinkSync(path.join(dir, f))
      }
      states[state] = { frames: outFrames, fps: DEFAULT_FPS[state] ?? 6, loop: !NON_LOOP.has(state) }
      console.log(`[sprites] ${state}: ${frames.length} 帧（正式素材）`)
    }
  }

  // 2. 没有正式素材的状态用占位图
  for (const [file, state] of Object.entries(PLACEHOLDER_MAP)) {
    if (states[state]) continue
    const input = path.join(RAW_DIR, file)
    if (!fs.existsSync(input)) {
      console.warn(`[sprites] 缺少占位原图 ${file}，跳过 ${state}`)
      continue
    }
    const outStateDir = path.join(OUT_DIR, state)
    fs.mkdirSync(outStateDir, { recursive: true })
    await processImage(input, path.join(outStateDir, '000.png'))
    states[state] = { frames: [`${state}/000.png`], fps: DEFAULT_FPS[state], loop: true }
    console.log(`[sprites] ${state}: 占位帧（${file}）`)
  }

  // 3. 别名状态
  for (const [alias, target] of Object.entries(STATE_ALIASES)) {
    if (states[alias] || !states[target]) continue
    states[alias] = {
      frames: states[target].frames,
      fps: DEFAULT_FPS[alias],
      loop: !NON_LOOP.has(alias)
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ states }, null, 2)
  )
  console.log(`[sprites] manifest.json 已生成（${Object.keys(states).length} 个状态）`)
}

main().catch((err) => {
  console.error('[sprites] 处理失败', err)
  process.exit(1)
})
