import type { Reminder } from '../../shared/types'
import type { ReminderStore } from './store'

/** 触发的宽容窗口：任务因睡眠/卡顿错过的时间在 5 分钟内仍补触发 */
const MISS_TOLERANCE_MS = 5 * 60 * 1000

/**
 * 提醒调度引擎（主进程）
 * 每次只安排最近的一个触发点，触发后重新计算；app 重启后从 reminders.json 恢复
 */
export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null

  constructor (
    private store: ReminderStore,
    private onFire: (reminder: Reminder) => void
  ) {}

  start (): void {
    this.store.onChange(() => this.reschedule())
    this.reschedule()
  }

  stop (): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  reschedule (): void {
    this.stop()
    const now = Date.now()
    const due: Reminder[] = []
    let nextAt: number | null = null

    for (const reminder of this.store.list()) {
      if (!reminder.enabled) continue
      const fireAt = nextFireAt(reminder, now)
      if (fireAt === null) continue
      if (fireAt <= now) {
        due.push(reminder)
      } else if (nextAt === null || fireAt < nextAt) {
        nextAt = fireAt
      }
    }

    for (const reminder of due) {
      this.fire(reminder)
    }

    if (nextAt !== null) {
      const delay = Math.max(nextAt - Date.now(), 250)
      this.timer = setTimeout(() => this.reschedule(), delay)
    }
  }

  private fire (reminder: Reminder): void {
    const firedAt = new Date().toISOString()
    if (reminder.type === 'once') {
      this.store.update(reminder.id, { enabled: false, lastFiredAt: firedAt })
    } else {
      this.store.update(reminder.id, { lastFiredAt: firedAt })
    }
    this.onFire({ ...reminder, lastFiredAt: firedAt })
  }
}

/** 计算某任务的下一次触发时间戳；返回 null 表示不会再触发 */
export function nextFireAt (reminder: Reminder, nowMs: number): number | null {
  const now = new Date(nowMs)
  const lastFired = reminder.lastFiredAt ? Date.parse(reminder.lastFiredAt) : null

  switch (reminder.type) {
    case 'once': {
      if (!reminder.datetime) return null
      if (lastFired !== null) return null
      const at = Date.parse(reminder.datetime)
      if (Number.isNaN(at)) return null
      // 已过期但在宽容窗口内 → 立即补触发；超过则视为失效
      if (at <= nowMs) {
        return nowMs - at <= MISS_TOLERANCE_MS ? nowMs : null
      }
      return at
    }

    case 'daily': {
      const hm = parseTime(reminder.time)
      if (!hm) return null
      for (let d = 0; d <= 1; d++) {
        const candidate = atTime(addDays(now, d), hm)
        if (isFuture(candidate, nowMs, lastFired)) return candidate
      }
      return null
    }

    case 'weekly': {
      const hm = parseTime(reminder.time)
      if (!hm || !reminder.weekdays || reminder.weekdays.length === 0) return null
      for (let d = 0; d <= 7; d++) {
        const day = addDays(now, d)
        if (!reminder.weekdays.includes(day.getDay())) continue
        const candidate = atTime(day, hm)
        if (isFuture(candidate, nowMs, lastFired)) return candidate
      }
      return null
    }

    case 'interval': {
      const minutes = reminder.intervalMinutes
      if (!minutes || minutes < 1) return null
      const intervalMs = minutes * 60 * 1000
      // 无锚点（旧数据）：立即触发一次，触发后 lastFiredAt 即成为锚点
      if (lastFired === null) return nowMs
      const next = lastFired + intervalMs
      // 错过多次则立即补一次
      return next <= nowMs ? nowMs : next
    }
  }
}

function parseTime (time?: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? '')
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

function addDays (date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function atTime (date: Date, hm: { h: number; m: number }): number {
  const d = new Date(date)
  d.setHours(hm.h, hm.m, 0, 0)
  return d.getTime()
}

/** 候选时间必须在 now 之后且与上次触发不同（避免同一分钟内重复触发） */
function isFuture (candidate: number, nowMs: number, lastFired: number | null): boolean {
  if (candidate <= nowMs) {
    // 错过但在宽容窗口内，且本轮还没触发过 → 补触发
    return (
      nowMs - candidate <= MISS_TOLERANCE_MS &&
      (lastFired === null || lastFired < candidate)
    )
  }
  return true
}
