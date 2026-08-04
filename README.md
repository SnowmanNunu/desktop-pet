# 🐺 旺财桌面宠物

一只穿西装的桌面二哈。它会在屏幕上闲逛、追着你的鼠标跑、困了会趴着睡觉，还能按你设定的时间提醒你 —— 跳起来、举着气泡，直到你看见。

![logo](resources/logo.svg)

## ✨ 功能特性

- **🖼️ 序列帧动画** — AI 生成的统一形象帧图，按状态播放（待机 / 走路 / 坐下 / 开心…）
- **⏰ 定时提醒** — 一次 / 每天 / 每周 / 间隔四种模式，主进程统一调度，重启不丢
- **🐕 丰富行为** — 闲逛、跟随鼠标、坐下、睡觉（Zzz）、点击撒娇（跳 / 叫 / 乖巧）
- **🖐️ 自由拖拽** — 按住拖到屏幕任意位置
- **💻 桌面体验** — 透明置顶小窗口、系统托盘、`Ctrl/Cmd+Shift+S` 呼出面板

> v2.0 起不再提供 uTools 插件版，仅支持独立桌面应用（Electron）。

## 🚀 快速开始

### 开发

```bash
npm install
npm run dev        # 开发模式（热更新）
```

### 构建与打包

```bash
npm run build      # 构建到 out/
npm run dist:mac   # 打包 macOS dmg（输出到 release/）
npm run dist:win   # 打包 Windows 便携版 exe
npm run dist:linux # 打包 Linux AppImage
```

### 类型检查

```bash
npm run typecheck
```

## 🎨 宠物素材

宠物使用**序列帧素材**，按状态组织：

```
src/renderer/public/sprites/
├── manifest.json       # 每个状态的帧列表 / fps / 是否循环
├── idle/  walk/  sit/  sleep/  happy/  jump/  bark/  remind/  drag/
```

- 帧图命名 `000.png, 001.png…`，透明底，建议 ≤ 512×512
- 未提供素材的状态自动回退到 `idle`

### 素材处理管线

把 AI 生成的原图（带背景）放入 `assets/raw/`（占位图）或按状态放入 `assets/frames/<state>/`（正式帧），然后：

```bash
# 可选：安装 rembg 获得更好的去底效果（隔离在虚拟环境中）
python3 -m venv tools/.venv
tools/.venv/bin/pip install 'rembg[cli]'

npm run prepare:sprites   # 去底 → 裁边 → 统一尺寸 → 生成 manifest.json
```

## 📁 项目结构

```
desktop-pet/
├── src/
│   ├── main/               # Electron 主进程（窗口 / 托盘 / 光标轮询 / 拖拽 / 提醒调度）
│   │   └── reminders/      # 提醒引擎：store（JSON 持久化）/ scheduler / notifier
│   ├── preload/            # pet / panel 两个 preload（contextBridge）
│   ├── renderer/
│   │   ├── pet/            # 宠物窗口：纯 TS + Canvas 序列帧播放器 + 状态机
│   │   └── panel/          # 控制面板：React + MUI
│   └── shared/             # 共享类型与 IPC 通道常量
├── assets/                 # 素材原图（raw/）与正式帧（frames/）
├── tools/                  # 素材处理脚本
├── resources/              # 应用图标
└── electron.vite.config.ts # electron-vite 构建配置
```

## 🛠️ 技术栈

- **框架**：Electron + electron-vite（Vite 6）
- **语言**：TypeScript（主进程 / preload / 渲染进程全覆盖）
- **控制面板**：React 19 + MUI 7
- **宠物渲染**：原生 Canvas 2D 序列帧播放器（无图形库）
- **打包**：electron-builder

## ⚠️ 从 v1.x 升级

- 旧版提醒任务存于 localStorage，首次打开面板会提示**一键导入**
- uTools 插件版已停止维护

## 📄 License

[MIT](LICENSE)

---

> 愿你的桌面多一只治愈的小跟班 🐺
