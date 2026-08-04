/**
 * 交互输入：Pointer Events 为主，鼠标事件兜底
 * （透明无边框 + focusable:false 窗口下 Pointer Events 可能不派发）
 */

export interface InputHandlers {
  /** 按住移动超过阈值 → 开始拖拽，参数为光标相对窗口左上角的偏移 */
  onDragStart: (offsetX: number, offsetY: number) => void
  /** 拖拽结束 */
  onDragEnd: () => void
  /** 快速点击（非拖拽），参数为窗口内坐标 */
  onClick: (x: number, y: number) => void
  /** 鼠标活动（用于唤醒睡眠） */
  onActivity: () => void
}

export interface InputController {
  /** 鼠标当前是否按住 */
  isMouseDown: () => boolean
}

export function bindInput (
  canvas: HTMLCanvasElement,
  handlers: InputHandlers
): InputController {
  const DRAG_THRESHOLD_PX = 8
  const DRAG_THRESHOLD_MS = 250
  const CLICK_MAX_MS = 400

  let down = false
  let downTime = 0
  let downX = 0
  let downY = 0
  let dragging = false
  let lastPointerId: number | null = null

  function handleDown (clientX: number, clientY: number, pointerId: number | null): void {
    down = true
    downTime = performance.now()
    downX = clientX
    downY = clientY
    lastPointerId = pointerId
    if (pointerId !== null) {
      try {
        canvas.setPointerCapture(pointerId)
      } catch {
        // 某些环境不支持捕获，忽略
      }
    }
  }

  function handleMove (clientX: number, clientY: number): void {
    handlers.onActivity()
    if (down && !dragging) {
      const dx = clientX - downX
      const dy = clientY - downY
      const dt = performance.now() - downTime
      if (
        Math.abs(dx) > DRAG_THRESHOLD_PX ||
        Math.abs(dy) > DRAG_THRESHOLD_PX ||
        dt > DRAG_THRESHOLD_MS
      ) {
        dragging = true
        document.body.classList.add('dragging')
        handlers.onDragStart(clientX, clientY)
      }
    }
  }

  function handleUp (pointerId: number | null, clientX: number, clientY: number): void {
    if (!down) return
    down = false
    if (pointerId !== null) {
      try {
        canvas.releasePointerCapture(pointerId)
      } catch {
        // ignore
      }
    }

    if (dragging) {
      dragging = false
      document.body.classList.remove('dragging')
      handlers.onDragEnd()
      return
    }

    if (performance.now() - downTime < CLICK_MAX_MS) {
      handlers.onClick(clientX, clientY)
    }
  }

  function pointerCaptureActive (): boolean {
    return (
      lastPointerId !== null &&
      typeof canvas.hasPointerCapture === 'function' &&
      canvas.hasPointerCapture(lastPointerId)
    )
  }

  // ---- Pointer Events 主通道 ----
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    handleDown(e.clientX, e.clientY, e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => handleMove(e.clientX, e.clientY))
  canvas.addEventListener('pointerup', (e) => handleUp(e.pointerId, e.clientX, e.clientY))
  canvas.addEventListener('pointercancel', (e) => handleUp(e.pointerId, e.clientX, e.clientY))

  // ---- 鼠标事件兜底通道 ----
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || down) return
    handleDown(e.clientX, e.clientY, null)
  })
  window.addEventListener('mousemove', (e) => {
    if (!down || pointerCaptureActive()) return
    handleMove(e.clientX, e.clientY)
  })
  window.addEventListener('mouseup', (e) => {
    if (!down || pointerCaptureActive()) return
    handleUp(null, e.clientX, e.clientY)
  })

  return {
    isMouseDown: () => down
  }
}
