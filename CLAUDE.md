# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

桌面哈士奇 is a desktop husky pet application. It ships in two forms from the same source:

1. **uTools plugin** — the `dist/` folder is loaded as a uTools plugin (`plugin.json` is the entry manifest).
2. **Standalone Electron app** — the `standalone/` directory wraps the same `dist/` assets in a regular Electron process.

The control panel is a React + MUI settings UI. The pet itself is a transparent 220×220 canvas window driven by plain JavaScript.

## Common commands

All core development happens in the repository root.

```bash
# Install dependencies
npm install

# Development watch build (rebuilds on changes)
npm run dev

# Production build — emits bridge/preload.js, bundles src/ into dist/, and copies public/ to dist/
npm run build
```

There are **no test or lint scripts** configured in `package.json`.

To run the standalone Electron app after building:

```bash
cd standalone
npm install
npm start
```

To package the standalone app:

```bash
cd standalone
npx electron-builder --win   # or --mac / --linux
```

## High-level architecture

### Build outputs

`webpack.config.js` defines two webpack builds:

- `target: 'electron-preload'` — compiles `bridge/preload.js` to `dist/preload.js` for the uTools plugin preload.
- `target: 'web'` — compiles `src/index.js` (React + JSX) to `dist/index.js`.

`CopyWebpackPlugin` copies everything under `public/` into `dist/` as-is. **Files in `public/` are not transpiled.** If you edit `public/pet.js`, `public/pet_preload.js`, `public/pet.html`, or `public/plugin.json`, you must run `npm run build` to copy them into `dist/`.

By default webpack would also minify the copied public `.js` files. `webpack.config.js` excludes `pet.js` and `pet_preload.js` from Terser so the pet code stays readable and easier to debug.

### Control panel (settings UI)

- `src/App.js` — main React component. Renders the MUI settings panel and manages pet state (follow mouse, sleep, speed, default state, show on startup, scheduled tasks).
- `src/index.js` — React root mount.
- `src/index.less` — global styles, including the global error toast styling.
- `src/ErrorBoundary.js` — catches React and global errors and renders a toast. It calls `window.utools.copyText`, which is only available in uTools (the standalone preload does not currently mock this).

`App.js` interacts with the pet window through `window.services`:

- `window.services.createPetWindow(config)`
- `window.services.updatePetConfig(config)`
- `window.services.closePetWindow()`
- `window.services.isPetRunning()`

`App.js` reads/writes scheduled tasks from `localStorage` under `desktop-pet-tasks` and also persists the rest of the pet config under `desktop-pet-config`. On startup the saved config is merged with `DEFAULT_PET_CONFIG` so settings like `followMouse`, `defaultState`, and `showOnStartup` survive restarts.

### Visibility

The pet window can be visible or hidden while still running. `showOnStartup` in the config controls the initial visibility:

- In the uTools plugin, the pet window is created when the plugin is entered (`onPluginEnter`). If `showOnStartup` is `false`, the window is created hidden.
- In the standalone app, the pet is only created when the user clicks **开始**, which forces `showOnStartup: true` so the pet is shown immediately.
- The pet window can show itself when a scheduled-task reminder fires (`window.petApi.show()`).
- Toggling the **启动时显示** switch while the pet is running will immediately show or hide it.

Visibility APIs:

- `public/pet_preload.js` exposes `window.petApi.show()` and `window.petApi.hide()`.
  - uTools: uses `utools.sendToParent()` (uTools ≥ 6.1.0) with a `window.opener.postMessage` fallback for older versions.
  - Standalone: sends `show-pet-window` / `hide-pet-window` IPC to `standalone/main.js`.
- `bridge/preload.js` listens for both IPC and `postMessage` show/hide requests and calls `petWindow.show()` / `petWindow.hide()`.
- `standalone/main.js` handles `show-pet-window` / `hide-pet-window` IPC by calling `petWindow.show()` / `petWindow.hide()`.

### Follow mouse

The pet window follows the global cursor, not just the cursor position inside the pet window. Because cursor APIs may not be available inside a secondary window, the **parent process polls the cursor** and sends it to the pet window:

- uTools: `bridge/preload.js` polls `utools.getCursorScreenPoint()` every 30 ms and sends `cursor-position` to the pet window.
- Standalone: `standalone/main.js` polls `screen.getCursorScreenPoint()` every 30 ms and sends `cursor-position` to the pet window.
- `public/pet_preload.js` caches the latest `cursor-position` and exposes it via `window.petApi.getCursorScreenPoint()`.
- `public/pet.js` reads the cursor each animation frame and uses it for follow-mouse behavior and the `LOOK` state.

### Dragging

Dragging is implemented with Pointer Events plus mouse-event fallbacks:

- `canvas.addEventListener('pointerdown', ...)` captures the pointer and starts drag on pointer movement.
- `canvas.addEventListener('mousedown', ...)` acts as a fallback if Pointer Events are not delivered (common for transparent / `focusable: false` / always-on-top windows).
- `window.addEventListener('mousemove' / 'mouseup', ...)` continues the drag even if the cursor leaves the pet window.
- uTools: drag updates the window position locally via `utools.setWindowPosition()`.
- Standalone: drag sends `start-pet-drag` IPC; the main process polls the cursor and moves the window with `petWindow.setPosition()` until `end-pet-drag`.

### Pet window

- `public/pet.html` — transparent frameless window containing a full-size `<canvas id="petCanvas">`.
- `public/pet.js` — canvas rendering, animation loop, state machine (idle/walk/sit/sleep/jump/bark/drag), global cursor tracking, mouse/drag handling (with Pointer Events and mouse-event fallbacks), click reactions, scheduled-task reminders, and visibility handling.
- `public/pet_preload.js` — pet-window preload. Receives `pet-config` and `cursor-position` IPC messages and forwards them to the renderer via `window.postMessage`. Exposes `window.petApi` (`setPosition`, `getCursorScreenPoint`, `show`, `hide`, `startDrag`, `endDrag`) that works with both uTools and Electron IPC.

The pet window updates its own screen position by calling `window.petApi.setPosition(x, y)`.

### uTools plugin integration

- `bridge/preload.js` — uTools plugin preload. Exposes `window.services` that create the pet window via `utools.createBrowserWindow('pet.html', …)` and send config updates through `petWindow.webContents.send('pet-config', config)`. Honors `config.showOnStartup` by creating the window hidden when false. Also polls the cursor and sends it to the pet window for follow-mouse.
- `public/plugin.json` — uTools plugin manifest. `main: "index.html"`, `preload: "preload.js"`, `logo: "logo.png"`.

### Standalone Electron integration

- `standalone/main.js` — Electron main process. Creates the control window, the pet window, the system tray, polls the cursor for follow-mouse, handles global drag, and registers the global shortcut `Ctrl+Shift+S` to show/hide the control panel.
- `standalone/preload.js` — control-panel preload for the standalone app. Mocks a minimal `window.utools` object and exposes `window.services` that send IPC messages to the main process (`create-pet`, `update-pet-config`, `close-pet`, `is-pet-running`).

### State / data flow

- Pet configuration (followMouse, allowSleep, speed, defaultState, showOnStartup, tasks) is authored in the React UI.
- On change, `window.services.updatePetConfig(updates)` pushes the delta to the pet window.
- The pet window merges the config in `applyConfig()`.
- Scheduled tasks are persisted in `localStorage` under the key `desktop-pet-tasks`. Both `App.js` and `public/pet.js` read and write this key, so the pet window can check reminders even when the settings UI is closed.

### Release pipeline

`.github/workflows/release.yml` builds the uTools plugin (`npm run build`) and then packages standalone binaries for Windows, macOS, and Linux from `standalone/`. It runs on git tag pushes matching `v*` and on `workflow_dispatch`.

## Important implementation notes

- The pet canvas logical size is fixed at 220 CSS pixels (`LOGICAL_SIZE` in `public/pet.js`). The actual pet window size should stay in sync with this constant.
- `public/pet.js` is plain ES5-ish JavaScript (no JSX, no modules). Keep it that way; it is only copied, not transpiled.
- The standalone preload only mocks the `window.utools` methods actually used by `App.js` (`onPluginEnter`, `onPluginOut`, `isDarkColors`). `ErrorBoundary.js` additionally expects `window.utools.copyText`, which is not mocked.
- When adding new IPC between the control panel and the pet window, update both `bridge/preload.js` (uTools) and `standalone/preload.js` + `standalone/main.js` (Electron) so both targets keep working.
- Avoid relying on webpack to minify `public/pet.js` or `public/pet_preload.js`; they are excluded from Terser to prevent hard-to-debug minification issues in pet logic.
- `standalone/main.js` keeps a `currentPetConfig` object that mirrors the pet's running config; it is needed for cursor polling and show-on-startup behavior.
- `bridge/preload.js` also keeps a `currentPetConfig` object for the same reason.
