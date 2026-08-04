import { describe, expect, it } from 'vitest'
import { nextFireAt } from '../src/main/reminders/scheduler'
import type { Reminder } from '../src/shared/types'

const T0 = Date.parse('2026-08-04T12:00:00') // 周二

function reminder (patch: Partial<Reminder>): Reminder {
  return {
    id: 'test',
    title: '测试',
    type: 'daily',
    enabled: true,
    lastFiredAt: null,
    ...patch
  }
}

describe('nextFireAt - interval', () => {
  const iv = reminder({
    type: 'interval',
    intervalMinutes: 1,
    lastFiredAt: new Date(T0).toISOString()
  })

  it('锚点 + 间隔 = 下次触发', () => {
    expect(nextFireAt(iv, T0)).toBe(T0 + 60_000)
  })

  it('到点即到期（<= now）', () => {
    expect(nextFireAt(iv, T0 + 60_000)!).toBeLessThanOrEqual(T0 + 60_000)
  })

  it('触发后进入下一周期', () => {
    const fired = { ...iv, lastFiredAt: new Date(T0 + 60_000).toISOString() }
    expect(nextFireAt(fired, T0 + 60_001)).toBe(T0 + 120_000)
  })

  it('无锚点（旧数据）立即触发自愈', () => {
    expect(nextFireAt({ ...iv, lastFiredAt: null }, T0)).toBe(T0)
  })

  it('间隔小于 1 分钟视为非法', () => {
    expect(nextFireAt({ ...iv, intervalMinutes: 0 }, T0)).toBeNull()
  })
})

describe('nextFireAt - daily', () => {
  const daily = reminder({ type: 'daily', time: '12:30' })

  it('今天未到点 → 今天', () => {
    expect(nextFireAt(daily, T0)).toBe(Date.parse('2026-08-04T12:30:00'))
  })

  it('今天已触发 → 明天', () => {
    const fired = { ...daily, lastFiredAt: new Date(Date.parse('2026-08-04T12:30:00')).toISOString() }
    expect(nextFireAt(fired, Date.parse('2026-08-04T12:31:00'))).toBe(
      Date.parse('2026-08-05T12:30:00')
    )
  })

  it('错过在宽容窗口内 → 立即补触发', () => {
    const at = nextFireAt(daily, Date.parse('2026-08-04T12:33:00'))
    expect(at).toBeLessThanOrEqual(Date.parse('2026-08-04T12:33:00'))
  })

  it('非法时间格式 → null', () => {
    expect(nextFireAt({ ...daily, time: '25:00' }, T0)).toBeNull()
  })
})

describe('nextFireAt - once', () => {
  const once = reminder({ type: 'once', datetime: '2026-08-04T13:00' })

  it('未来 → 按时触发', () => {
    expect(nextFireAt(once, T0)).toBe(Date.parse('2026-08-04T13:00'))
  })

  it('过期超出宽容窗口 → null', () => {
    expect(nextFireAt(once, Date.parse('2026-08-04T13:10:00'))).toBeNull()
  })

  it('已触发 → null', () => {
    const fired = { ...once, enabled: false, lastFiredAt: new Date(T0).toISOString() }
    expect(nextFireAt(fired, T0)).toBeNull()
  })
})

describe('nextFireAt - weekly', () => {
  // T0 是周二；weekdays=[3]（周三）10:00
  const weekly = reminder({ type: 'weekly', time: '10:00', weekdays: [3] })

  it('下个周三', () => {
    expect(nextFireAt(weekly, T0)).toBe(Date.parse('2026-08-05T10:00:00'))
  })

  it('空 weekdays → null', () => {
    expect(nextFireAt({ ...weekly, weekdays: [] }, T0)).toBeNull()
  })
})
