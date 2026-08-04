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
        </Stack>

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
