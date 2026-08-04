# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

旺财桌面宠物 is a desktop husky pet app (v2.0, refactored from the v1.x uTools+Electron dual-target project). Electron-only, built with electron-vite + TypeScript. The pet is rendered from AI-generated sprite frame sequences (not procedural drawing). Timed reminders are scheduled in the main process and survive panel close / app restart.

## Common commands

```bash
npm install
npm run dev              # electron-vite dev (hot reload, launches Electron)
npm run build            # build main/preload/renderer to out/
npm run typecheck        # tsc --noEmit for node + web configs
npm run prepare:sprites  # process sprite assets (see tools/prepare-sprites.mjs)
npm run dist:mac         # build + package dmg (also dist:win / dist:linux)
```

There are **no test or lint scripts** configured.

## High-level architecture

Three electron-vite build targets (see `electron.vite.config.ts`):

- **main** (`src/main/`) — ESM output `out/main/index.js`
- **preload** (`src/preload/`) — ESM output `out/preload/{pet,panel}.mjs`; requires `sandbox: false` in BrowserWindow webPreferences
- **renderer** (`src/renderer/`) — two pages: `panel/` (React + MUI control panel) and `pet/` (plain TS + Canvas, no React)

Shared code lives in `src/shared/` (`types.ts`, `ipc-channels.ts`) and is imported by all three targets — always add new IPC channels to `src/shared/ipc-channels.ts` and use the constants everywhere.

### Process / window model

- The pet window (220×220, transparent, frameless, always-on-top, `focusable: false`) is created at app start; visibility honors `showOnStartup`.
- The control panel window hides on close instead of quitting — the app stays alive in the tray so reminders keep firing. Quit only via the tray menu (`app.exit(0)`), and `window-all-closed` is intentionally a no-op.
- Single instance lock in `src/main/index.ts`.

### Pet rendering (renderer/pet)

- `sprite.ts` — SpritePlayer loads `sprites/manifest.json` (each state: frames, fps, loop), preloads frames, `play(state)` switches with fallback to `idle`, draws bottom-aligned with optional horizontal flip for facing.
- `states.ts` — state machine ported from v1: idle/walk/sit/sleep/look/drag/jump/bark + new `remind` (highest priority, ~3s). Movement speed base is `WALK_SPEED × config.speed`.
- `input.ts` — Pointer Events primary + mouse-event fallback (transparent focusable windows may not deliver pointer events). Drag threshold: 8px or 250ms; click: < 400ms.
- `bubble.ts` — Canvas-drawn reminder bubble, reaction text ("汪！"), sleep Zzz overlay.
- Sprites are served from `src/renderer/public/sprites/`; the pet page fetches them via the relative path `../sprites/` (works in both dev server and packaged `loadFile`).

### Reminders (main process, single source of truth)

- `reminders/store.ts` — persists to `userData/reminders.json` (atomic tmp+rename write), notifies listeners on change.
- `reminders/scheduler.ts` — computes next fire time per reminder (`once` / `daily` / `weekly` / `interval`), schedules a single `setTimeout` for the nearest one, reschedules after each fire or store change. Missed fires within 5 minutes (`MISS_TOLERANCE_MS`) fire immediately on wake/restart.
- `reminders/notifier.ts` — on fire: show pet window → send `reminder-fired` to pet (plays `remind` animation + bubble) → system `Notification` fallback.
- Panel CRUD goes through IPC (`listReminders` / `addReminder` / `updateReminder` / `deleteReminder`); the panel no longer reads localStorage except for one-time legacy import (`importLegacyTasks` in `renderer/panel/api.ts` converts v1 tasks and clears the old key).

### Cursor follow & drag

- The pet window cannot read the global cursor, so the main process polls `screen.getCursorScreenPoint()` every 30ms (`src/main/cursor.ts`) and forwards it; the pet preload caches it for `petApi.getCursorScreenPoint()`.
- Drag: renderer detects drag start → `start-pet-drag` IPC → main polls cursor at 16ms and moves the window (`src/main/drag.ts`) until `end-pet-drag`.

## Important implementation notes

- **Dependency pins**: `@mui/material` / `@mui/icons-material` are pinned to v7 and `typescript` to ~5.9 — v9 / TS 7 are installed by default by npm and break the panel's type-check.
- Preload outputs are `.mjs` (package.json has `"type": "module"`); window code references `../preload/pet.mjs` / `panel.mjs`. Do not rename outputs without updating `src/main/windows.ts`.
- Pet window logical size is `PET_WINDOW_SIZE = 220` in `src/main/windows.ts` and `LOGICAL_SIZE = 220` in `src/renderer/pet/main.ts` — keep in sync.
- Sprite states without assets fall back to `idle`; aliases (sleep/jump/bark/remind/drag) are defined in `tools/prepare-sprites.mjs` (`STATE_ALIASES`).
- `rembg` (sprite background removal) installs into `tools/.venv`; without it the sprite tool falls back to `sharp` trim, which cannot remove gradient backgrounds.
- `npm run dev` smoke tests: the app opens real windows on the host machine.
