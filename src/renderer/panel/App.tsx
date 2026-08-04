import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PetsIcon from '@mui/icons-material/Pets'
import SettingsIcon from '@mui/icons-material/Settings'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PET_CONFIG, type PetConfig, type Reminder } from '../../shared/types'
import { importLegacyTasks, readLegacyTasks } from './api'
import PetSettings from './components/PetSettings'
import ReminderEditor from './components/ReminderEditor'
import ReminderList from './components/ReminderList'

interface UpdateInfo {
  current: string
  latest: string | null
  url: string | null
  hasUpdate: boolean
  error?: string
}

export default function App (): React.JSX.Element {
  const [config, setConfig] = useState<PetConfig>(DEFAULT_PET_CONFIG)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [petRunning, setPetRunning] = useState(false)
  const [legacyCount, setLegacyCount] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [tab, setTab] = useState(0)

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 渐变头部横幅 */}
      <Box
        sx={{
          m: 2,
          mb: 0,
          p: 2,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%)',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <PetsIcon sx={{ fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              哈士奇桌面宠物
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              一只住在桌面上的西装二哈
            </Typography>
          </Box>
          <Chip
            size="small"
            label={petRunning ? '● 运行中' : '○ 已停止'}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.22)',
              color: '#fff',
              backdropFilter: 'blur(4px)'
            }}
          />
          <Tooltip title="显示宠物">
            <IconButton
              size="small"
              sx={{ color: '#fff' }}
              onClick={() => window.panelApi.showPet()}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="隐藏宠物">
            <IconButton
              size="small"
              sx={{ color: '#fff' }}
              onClick={() => window.panelApi.hidePet()}
            >
              <VisibilityOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* 选项卡 */}
      <Tabs
        value={tab}
        onChange={(_e, v: number) => setTab(v)}
        variant="fullWidth"
        sx={{
          px: 2,
          minHeight: 44,
          '& .MuiTab-root': { minHeight: 44, fontWeight: 700 }
        }}
      >
        <Tab icon={<NotificationsActiveIcon fontSize="small" />} iconPosition="start" label="提醒" />
        <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="设置" />
      </Tabs>

      {/* 内容区（可滚动） */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 1.5 }}>
        {tab === 0 && (
          <Stack spacing={2}>
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
            <ReminderEditor onAdd={handleAddReminder} />
            <ReminderList
              reminders={reminders}
              onToggle={handleToggleReminder}
              onDelete={handleDeleteReminder}
            />
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2}>
            <PetSettings config={config} onChange={handleConfigChange} />

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              disabled={checkingUpdate}
              onClick={handleCheckUpdates}
            >
              {checkingUpdate ? '检查中…' : '检查更新'}
            </Button>

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

            <Typography variant="caption" color="text.secondary" textAlign="center">
              Ctrl/Cmd + Shift + S 显示/隐藏本面板
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
