/** IPC 通道名常量，main / preload / renderer 三方共用 */

// 面板 → 主进程（invoke，有返回值）
export const IPC = {
  // 配置
  getPetConfig: 'get-pet-config',
  updatePetConfig: 'update-pet-config',
  // 宠物窗口控制
  isPetRunning: 'is-pet-running',
  showPet: 'show-pet',
  hidePet: 'hide-pet',
  restartPet: 'restart-pet',
  // 提醒任务 CRUD
  listReminders: 'list-reminders',
  addReminder: 'add-reminder',
  updateReminder: 'update-reminder',
  deleteReminder: 'delete-reminder',
  // 旧版 localStorage 数据迁移
  importLegacyTasks: 'import-legacy-tasks',
  // 稍后提醒（snooze）
  snoozeReminder: 'snooze-reminder',
  // 检查更新 / 打开链接
  checkUpdates: 'check-updates',
  openExternal: 'open-external',

  // 宠物窗口 → 主进程（send）
  movePetWindow: 'move-pet-window',
  startPetDrag: 'start-pet-drag',
  endPetDrag: 'end-pet-drag',
  petContextMenu: 'pet-context-menu',

  // 主进程 → 宠物窗口
  petConfig: 'pet-config',
  cursorPosition: 'cursor-position',
  reminderFired: 'reminder-fired',
  petCommand: 'pet-command',

  // 主进程 → 面板
  petStatus: 'pet-status',
  remindersChanged: 'reminders-changed'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
