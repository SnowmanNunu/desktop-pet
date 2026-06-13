# 🐺 桌面哈士奇 — 你的桌面小跟班

一只会走、会睡、会闹的矢量风格桌面哈士奇宠物。它会在屏幕边缘闲逛、追着鼠标跑、被你点击撒娇，也能被你拖到任意位置。

![logo](public/logo.svg)

## ✨ 功能特性

- **程序化 Canvas 绘制**
  - 无外部图片素材，一只可缩放的矢量哈士奇
  - 蓝灰毛色、冰蓝眼睛、会摇的尾巴、会动的耳朵

- **丰富的行为状态**
  - 🛌 睡觉 — 趴着闭眼，鼠标一动就醒
  - 🪑 坐下 — 乖乖待在原地
  - 🚶 闲逛 — 自己在屏幕里溜达
  - 🏃 跟随 — 开启后追着鼠标跑
  - 🐕 吠叫 / 跳跃 — 点击它触发可爱反馈

- **实时参数调节**
  - 跟随鼠标：开关控制
  - 自动休眠：让它没事就睡觉
  - 移动速度：0.5× ~ 2× 可调
  - 启动默认状态：待机 / 坐下 / 睡觉

- **趣味交互**
  - 🖱️ **跟随鼠标** — 哈士奇会看向并走向光标
  - ✨ **点击反馈** — 点击会跳、叫或坐下
  - 🖐️ **拖拽移动** — 按住拖到屏幕任意位置

- **视觉体验**
  - 透明小窗口，不遮挡正常工作
  - 始终置顶，随时能看到它
  - 支持系统深色/浅色模式自动适配

## 🖼️ 两种使用方式

| 方式 | 特点 | 适用场景 |
|------|------|---------|
| **uTools 插件版** | 呼出即用，支持全部交互 | 已安装 uTools 的用户 |
| **独立桌面版** | 双击运行，无需任何依赖 | 未安装 uTools 的用户 |

---

## 🚀 一、uTools 插件版

### 前置要求

- [uTools](https://www.u.tools/) 已安装（Windows / macOS / Linux）
- [Node.js](https://nodejs.org/) ≥ 18

### 本地构建

```bash
# 1. 克隆仓库
cd desktop-pet

# 2. 安装依赖
npm install

# 3. 构建插件
npm run build
```

构建完成后，会在项目根目录生成 `dist/` 文件夹，包含完整的插件文件。

### 开发模式（热更新）

```bash
npm run dev
```

webpack 会监视文件变化并自动重新构建，方便开发调试。

### uTools 中加载

1. 打开 uTools，输入「插件管理」或进入「开发者工具」
2. 选择「新建项目」→「本地导入」
3. 选择构建后的 `dist/` 目录
4. 项目会出现在「我的插件」中，点击即可运行

> 提示：uTools 插件开发详情可参考 [官方文档](https://u.tools/docs/)。

---

## 💻 二、独立桌面版（无需 uTools）

双击即可运行，不依赖任何外部环境。

### 快速开始

```bash
# 1. 先构建插件源码
cd desktop-pet
npm install
npm run build

# 2. 安装 Electron 并启动独立版
cd standalone
npm install
npm start
```

> 如果 Electron 下载慢，可设置镜像：
> `export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`

### 打包成可执行文件

```bash
cd standalone
npm run build
```

打包完成后在 `standalone/release/` 目录生成：
- **Windows**: `husky-desktop-1.0.0-x64.exe`（便携版，双击运行）
- **macOS**: `husky-desktop-1.0.0-arm64.dmg`
- **Linux**: `husky-desktop-1.0.0-x64.AppImage`

### 独立版使用说明

1. 双击运行后弹出**控制面板**
2. 点击「开始」在桌面开启哈士奇宠物窗口
3. 宠物窗口**不影响桌面操作**（只在 220×220 小区域内响应鼠标）
4. 随时通过以下方式控制：
   - 控制面板的「停止」按钮
   - 任务栏右下角 🐺 **托盘图标** → 右键菜单
   - 快捷键 **`Ctrl + Shift + S`** 显示/隐藏控制面板

---

## 📁 项目结构

```
desktop-pet/
├── public/                 # 静态资源
│   ├── index.html          # 设置面板入口
│   ├── pet.html            # 宠物窗口页面
│   ├── pet.js              # Canvas 哈士奇核心动画
│   ├── pet_preload.js      # 宠物窗口 preload
│   ├── plugin.json         # uTools 插件配置
│   └── logo.*              # 插件图标
├── src/                    # React 设置面板源码
│   ├── App.js              # 主界面
│   ├── index.js            # React 入口
│   └── index.less          # 样式
├── bridge/
│   └── preload.js          # uTools 版 preload
├── standalone/             # 独立桌面版
│   ├── main.js             # Electron 主进程
│   ├── preload.js          # 模拟 uTools API
│   ├── package.json        # 独立版打包配置
│   └── README.md           # 独立版说明
├── webpack.config.js       # 构建配置
└── package.json
```

## 🛠️ 技术栈

- **设置面板**：React 19 + MUI 7 + Emotion
- **宠物渲染**：原生 Canvas 2D API，无需任何图形库
- **构建工具**：Webpack 5 + Babel 7
- **独立版框架**：Electron 31

## 📝 配置说明

`public/plugin.json` 是 uTools 的插件配置文件：

```json
{
  "main": "index.html",
  "logo": "logo.png",
  "preload": "preload.js",
  "features": [
    {
      "code": "husky",
      "explain": "桌面哈士奇 - 会走会闹的桌面宠物",
      "icon": "logo.svg",
      "cmds": ["哈士奇", "husky", "桌面宠物", "宠物"]
    }
  ]
}
```

你可以通过修改 `cmds` 来添加自己喜欢的呼出关键词。

## 📦 版本历史

### v1.0.0（2026-06-12）

- ✨ 首发上线，桌面哈士奇宠物
- 🐕 支持待机、坐下、睡觉、跟随鼠标、点击反馈、拖拽移动
- 🎚️ 实时调节跟随、休眠、速度、启动状态
- 💻 支持 uTools 插件与独立桌面版双平台
- 🌙 自动适配系统深色 / 浅色模式
- ⚡ 基于原生 Canvas 2D 渲染，流畅低耗

## 🤝 参与贡献

欢迎提交 Issue 和 PR！如果你有任何新点子（比如新增宠物皮肤、更多互动动作、AI 对话），随时来聊。

## 📄 License

[MIT](LICENSE)

---

> 愿你的桌面多一只治愈的小跟班 🐺
