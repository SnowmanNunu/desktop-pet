import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Reminder } from '../../shared/types'

/**
 * 提醒任务持久化：userData/reminders.json
 * 单一数据源 —— 面板与宠物窗口都通过 IPC 访问，不再各自读写 localStorage
 */
export class ReminderStore {
  private reminders: Reminder[] = []
  private loaded = false
  private changeListeners: Array<(reminders: Reminder[]) => void> = []

  private file (): string {
    return path.join(app.getPath('userData'), 'reminders.json')
  }

  load (): Reminder[] {
    if (this.loaded) return this.reminders
    this.loaded = true
    try {
      const raw = fs.readFileSync(this.file(), 'utf-8')
      const parsed = JSON.parse(raw)
      this.reminders = Array.isArray(parsed) ? parsed : []
    } catch {
      this.reminders = []
    }
    return this.reminders
  }

  list (): Reminder[] {
    return this.load()
  }

  add (reminder: Reminder): Reminder[] {
    this.load()
    this.reminders = [...this.reminders, reminder]
    this.persist()
    return this.reminders
  }

  update (id: string, patch: Partial<Reminder>): Reminder[] {
    this.load()
    this.reminders = this.reminders.map((r) =>
      r.id === id ? { ...r, ...patch, id: r.id } : r
    )
    this.persist()
    return this.reminders
  }

  remove (id: string): Reminder[] {
    this.load()
    this.reminders = this.reminders.filter((r) => r.id !== id)
    this.persist()
    return this.reminders
  }

  onChange (listener: (reminders: Reminder[]) => void): void {
    this.changeListeners.push(listener)
  }

  private persist (): void {
    try {
      const file = this.file()
      const tmp = file + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(this.reminders, null, 2), 'utf-8')
      fs.renameSync(tmp, file)
    } catch (err) {
      console.error('[reminders] save failed', err)
    }
    for (const listener of this.changeListeners) {
      listener(this.reminders)
    }
  }
}
