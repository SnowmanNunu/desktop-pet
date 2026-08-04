import type { Reminder } from '../../shared/types'

/** 旧版任务（v1.x localStorage["desktop-pet-tasks"]） */
const LEGACY_TASKS_KEY = 'desktop-pet-tasks'

interface LegacyTask {
  id: string
  content: string
  time: string
  repeat: 'once' | 'daily' | 'weekdays' | 'weekends'
  enabled: boolean
}

/** 读取旧版 localStorage 任务（用于迁移提示） */
export function readLegacyTasks (): LegacyTask[] {
  try {
    const raw = localStorage.getItem(LEGACY_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 旧版任务 → 新版 Reminder，并清除旧数据 */
export async function importLegacyTasks (): Promise<number> {
  const legacy = readLegacyTasks()
  if (legacy.length === 0) return 0

  const today = new Date()
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-')

  const reminders: Reminder[] = legacy.map((task) => {
    const base = {
      id: `legacy_${task.id}`,
      title: task.content,
      enabled: task.enabled,
      lastFiredAt: null
    }
    switch (task.repeat) {
      case 'once':
        return { ...base, type: 'once' as const, datetime: `${dateStr}T${task.time}` }
      case 'weekdays':
        return {
          ...base,
          type: 'weekly' as const,
          time: task.time,
          weekdays: [1, 2, 3, 4, 5]
        }
      case 'weekends':
        return { ...base, type: 'weekly' as const, time: task.time, weekdays: [0, 6] }
      default:
        return { ...base, type: 'daily' as const, time: task.time }
    }
  })

  await window.panelApi.importLegacyTasks(reminders)
  localStorage.removeItem(LEGACY_TASKS_KEY)
  return reminders.length
}

/** 任务类型中文名 */
export function reminderTypeLabel (reminder: Reminder): string {
  switch (reminder.type) {
    case 'once':
      return '一次'
    case 'daily':
      return '每天'
    case 'weekly':
      return '每周'
    case 'interval':
      return `每 ${reminder.intervalMinutes} 分钟`
  }
}

/** 任务触发时间的简短描述 */
export function reminderTimeLabel (reminder: Reminder): string {
  switch (reminder.type) {
    case 'once':
      return (reminder.datetime ?? '').replace('T', ' ')
    case 'daily':
      return reminder.time ?? ''
    case 'weekly': {
      const names = ['日', '一', '二', '三', '四', '五', '六']
      const days = (reminder.weekdays ?? []).map((d) => names[d]).join('、')
      return `周${days} ${reminder.time ?? ''}`
    }
    case 'interval':
      return ''
  }
}
