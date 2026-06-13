# 🐺 桌面哈士奇 — 独立桌面版

不依赖 uTools，直接作为 Electron 桌面应用运行。

## 🚀 快速开始

### 1. 确保源码已构建

在**项目根目录**执行：

```bash
cd ..
npm install
npm run build
```

构建完成后会生成 `dist/` 目录。

### 2. 安装 Electron

```bash
cd standalone
npm install
```

如果网络慢，可使用镜像：

```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install
```

### 3. 启动应用

```bash
npm start
```

运行后会弹出**控制面板窗口**，点击「开始」即可在桌面召唤哈士奇宠物。

---

## 📁 文件说明

| 文件 | 作用 |
|------|------|
| `main.js` | Electron 主进程，管理控制面板 + 宠物窗口 |
| `preload.js` | 控制面板 preload，模拟 uTools API |
| `package.json` | 独立版依赖与打包配置 |

---

## 📦 打包成可执行文件（可选）

```bash
npm run build
```

打包完成后在 `release/` 目录生成：
- Windows: `husky-desktop-1.0.0-x64.exe`（便携版）
- macOS: `husky-desktop-1.0.0-arm64.dmg`
- Linux: `husky-desktop-1.0.0-x64.AppImage`

---

## 🖥️ 与 uTools 版的区别

| 功能 | uTools 版 | 独立桌面版 |
|------|-----------|-----------|
| 呼出方式 | uTools 搜索关键词 | 双击运行程序 |
| 设置面板 | 嵌入 uTools 窗口 | 独立控制面板窗口 |
| 宠物窗口 | 同 uTools 版 | 220×220 置顶透明小窗口 |
| 鼠标交互 | ✅ | ✅ |
| 跟随/休眠/速度调节 | ✅ | ✅ |
| 系统主题适配 | ✅ | ✅ |

---

## ⚠️ 注意事项

- 控制面板关闭时，宠物窗口会自动关闭
- 宠物窗口为**透明小窗口**，不会遮挡正常工作区域
- 按住宠物可以拖到屏幕任意位置
- 如需在其他显示器上运行，可自行修改 `main.js` 中的 `screen.getPrimaryDisplay()`
