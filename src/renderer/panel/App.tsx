import PetsIcon from '@mui/icons-material/Pets'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PET_CONFIG, type PetConfig, type Reminder } from '../../shared/types'
import { importLegacyTasks, readLegacyTasks } from './api'
import PetSettings from './components/PetSettings'
import ReminderEditor from './components/ReminderEditor'
import ReminderList from './components/ReminderList'

export default function App (): React.JSX.Element {
  const [config, setConfig] = useState<PetConfig>(DEFAULT_PET_CONFIG)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [petRunning, setPetRunning] = useState(false)
  const [legacyCount, setLegacyCount] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<{
    current: string
    latest: string | null
    url: string | null
    hasUpdate: boolean
    error?: string
  } | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    window.panelApi.getConfig().then(setConfig)
    window.panelApi.listReminders().then(setReminders)
    window.panelApi.isPetRunning().then(setPetRunning)
    setLegacyCount(readLegacyTasks().length)

    window.panelApi.onPetStatus(setPetRunning)
    window.panelApi.onRemindersChanged(setReminders)
  }, [])

  const handleConfigChange = useCallback((patch: Partial<PetConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    window.panelApi.updateConfig(patch)
  }, [])

  const handleAddReminder = useCallback((reminder: Omit<Reminder, 'id'>) => {
    window.panelApi.addReminder(reminder).then(setReminders)
  }, [])

  const handleToggleReminder = useCallback((id: string, enabled: boolean) => {
    window.panelApi.updateReminder(id, { enabled }).then(setReminders)
  }, [])

  const handleDeleteReminder = useCallback((id: string) => {
    window.panelApi.deleteReminder(id).then(setReminders)
  }, [])

  const handleImportLegacy = useCallback(() => {
    importLegacyTasks().then((count) => {
      setLegacyCount(0)
      if (count > 0) window.panelApi.listReminders().then(setReminders)
    })
  }, [])

  const handleCheckUpdates = useCallback(() => {
    setCheckingUpdate(true)
    window.panelApi
      .checkUpdates()
      .then(setUpdateInfo)
      .finally(() => setCheckingUpdate(false))
  }, [])

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PetsIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            旺财桌面宠物
          </Typography>
          <Chip
            size="small"
            color={petRunning ? 'success' : 'default'}
            label={petRunning ? '运行中' : '已停止'}
          />
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.panelApi.showPet()}
          >
            显示宠物
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.panelApi.hidePet()}
          >
            隐藏宠物
          </Button>
          <Button
            size="small"
            variant="text"
            disabled={checkingUpdate}
            onClick={handleCheckUpdates}
          >
            {checkingUpdate ? '检查中…' : '检查更新'}
          </Button>
        </Stack>

        {updateInfo && (
          <Alert
            severity={updateInfo.error ? 'warning' : updateInfo.hasUpdate ? 'info' : 'success'}
            onClose={() => setUpdateInfo(null)}
            action={
              updateInfo.hasUpdate && updateInfo.url ? (
                <Button
                  size="small"
                  onClick={() => window.panelApi.openExternal(updateInfo.url!)}
                >
                  去下载
                </Button>
              ) : undefined
            }
          >
            {updateInfo.error
              ? updateInfo.error
              : updateInfo.hasUpdate
                ? `发现新版本 ${updateInfo.latest}（当前 v${updateInfo.current}）`
                : `已是最新版本（v${updateInfo.current}）`}
          </Alert>
        )}

        {legacyCount > 0 && (
          <Alert
            severity="info"
            action={
              <Button size="small" onClick={handleImportLegacy}>
                一键导入
              </Button>
            }
          >
            检测到 {legacyCount} 条旧版提醒任务
          </Alert>
        )}

        <PetSettings config={config} onChange={handleConfigChange} />

        <Divider />

        <ReminderEditor onAdd={handleAddReminder} />
        <ReminderList
          reminders={reminders}
          onToggle={handleToggleReminder}
          onDelete={handleDeleteReminder}
        />

        <Typography variant="caption" color="text.secondary" textAlign="center">
          Ctrl/Cmd + Shift + S 显示/隐藏本面板
        </Typography>
      </Stack>
    </Box>
  )
}
