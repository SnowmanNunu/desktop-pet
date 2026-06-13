import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import {
  Box, Typography, Button, Slider, Stack, Paper,
  ToggleButtonGroup, ToggleButton, Switch, FormControlLabel,
  TextField, IconButton, List, ListItem, ListItemText,
  Chip, Divider, InputAdornment
} from '@mui/material'
import PetsIcon from '@mui/icons-material/Pets'
import MouseIcon from '@mui/icons-material/Mouse'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import DeleteIcon from '@mui/icons-material/Delete'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AlarmOnIcon from '@mui/icons-material/AlarmOn'
import SvgIcon from '@mui/material/SvgIcon'

const THEME_DIC = {
  light: createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#2f5f8f' },
      secondary: { main: '#e989b6' },
      background: { default: '#f6fbff' }
    },
    shape: { borderRadius: 8 },
    typography: { fontFamily: 'system-ui' }
  }),
  dark: createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#9bd7ff' },
      secondary: { main: '#ffb1d1' },
      background: { default: '#20252b' }
    },
    shape: { borderRadius: 8 },
    typography: { fontFamily: 'system-ui' }
  })
}

const DEFAULT_PET_CONFIG = {
  followMouse: true,
  allowSleep: true,
  clickFeedback: true,
  speed: 1,
  defaultState: 'idle',
  showOnStartup: true,
  tasks: []
}

const PET_STATE_OPTIONS = [
  { value: 'idle', label: '待机' },
  { value: 'sit', label: '坐下' },
  { value: 'sleep', label: '睡觉' }
]

const REPEAT_OPTIONS = [
  { value: 'once', label: '一次' },
  { value: 'daily', label: '每天' },
  { value: 'weekdays', label: '工作日' },
  { value: 'weekends', label: '周末' }
]

const TASKS_STORAGE_KEY = 'desktop-pet-tasks'
const CONFIG_STORAGE_KEY = 'desktop-pet-config'

function loadSavedConfig () {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
    return null
  } catch (e) {
    return null
  }
}

function saveConfig (config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {}
}

// 哈士奇图标（内联 SVG）
function HuskyIcon (props) {
  return (
    <SvgIcon {...props} viewBox='0 0 24 24'>
      <path d='M12 2C9.5 2 7.5 4 7 6.5c-1.5.5-3 2-3 4 0 1.5.8 2.8 2 3.5-.2.8-.5 1.7-.5 2.5 0 2.5 2 4.5 4.5 4.5h4c2.5 0 4.5-2 4.5-4.5 0-.8-.3-1.7-.5-2.5 1.2-.7 2-2 2-3.5 0-2-1.5-3.5-3-4C16.5 4 14.5 2 12 2zM9.5 13c-.8 0-1.5-.7-1.5-1.5S8.7 10 9.5 10s1.5.7 1.5 1.5S10.3 13 9.5 13zm5 0c-.8 0-1.5-.7-1.5-1.5S13.7 10 14.5 10s1.5.7 1.5 1.5S15.3 13 14.5 13z' />
    </SvgIcon>
  )
}

function generateId () {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function loadTasks () {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function saveTasks (tasks) {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch (e) {}
}

function getRepeatLabel (value) {
  const opt = REPEAT_OPTIONS.find(function (item) { return item.value === value })
  return opt ? opt.label : value
}

export default function App () {
  const savedConfig = loadSavedConfig()
  const initialConfig = { ...DEFAULT_PET_CONFIG, ...savedConfig }

  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  const [petRunning, setPetRunning] = useState(false)

  // 宠物状态
  const [followMouse, setFollowMouse] = useState(initialConfig.followMouse)
  const [allowSleep, setAllowSleep] = useState(initialConfig.allowSleep)
  const [petClickFeedback, setPetClickFeedback] = useState(initialConfig.clickFeedback)
  const [petSpeed, setPetSpeed] = useState(initialConfig.speed)
  const [petDefaultState, setPetDefaultState] = useState(initialConfig.defaultState)
  const [showOnStartup, setShowOnStartup] = useState(initialConfig.showOnStartup)

  // 定时任务
  const [tasks, setTasks] = useState([])
  const [newTaskContent, setNewTaskContent] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('09:00')
  const [newTaskRepeat, setNewTaskRepeat] = useState('daily')

  const petConfigRef = useRef({ ...initialConfig })
  const petRunningRef = useRef(false)

  const updatePetConfig = useCallback(function (updates) {
    petConfigRef.current = { ...petConfigRef.current, ...updates }
    saveConfig(petConfigRef.current)
    if (window.services) {
      window.services.updatePetConfig(updates)
    }
  }, [])

  const startPet = useCallback(function () {
    if (window.services) {
      // 手动点击「开始」时总是显示宠物
      window.services.createPetWindow({ ...petConfigRef.current, showOnStartup: true })
      petRunningRef.current = true
      setPetRunning(true)
    }
  }, [])

  const stopPet = useCallback(function () {
    if (window.services) {
      window.services.closePetWindow()
      petRunningRef.current = false
      setPetRunning(false)
    }
  }, [])

  function handleFollowMouseChange (event) {
    const checked = event.target.checked
    setFollowMouse(checked)
    updatePetConfig({ followMouse: checked })
  }

  function handleAllowSleepChange (event) {
    const checked = event.target.checked
    setAllowSleep(checked)
    updatePetConfig({ allowSleep: checked })
  }

  function handlePetClickFeedbackChange (event) {
    const checked = event.target.checked
    setPetClickFeedback(checked)
    updatePetConfig({ clickFeedback: checked })
  }

  function handlePetSpeedChange (event, value) {
    setPetSpeed(value)
    updatePetConfig({ speed: value })
  }

  function handlePetDefaultStateChange (event, newState) {
    if (newState === null) return
    setPetDefaultState(newState)
    updatePetConfig({ defaultState: newState })
  }

  function handleShowOnStartupChange (event) {
    const checked = event.target.checked
    setShowOnStartup(checked)
    updatePetConfig({ showOnStartup: checked })
  }

  // 任务操作
  function syncTasks (nextTasks) {
    setTasks(nextTasks)
    saveTasks(nextTasks)
    updatePetConfig({ tasks: nextTasks })
  }

  function handleAddTask () {
    const content = newTaskContent.trim()
    if (!content) return
    const nextTasks = [...tasks, {
      id: generateId(),
      content: content,
      time: newTaskTime,
      repeat: newTaskRepeat,
      enabled: true,
      lastReminded: null
    }]
    syncTasks(nextTasks)
    setNewTaskContent('')
  }

  function handleDeleteTask (id) {
    syncTasks(tasks.filter(function (t) { return t.id !== id }))
  }

  function handleToggleTask (id) {
    syncTasks(tasks.map(function (t) {
      if (t.id !== id) return t
      return { ...t, enabled: !t.enabled }
    }))
  }

  function handleTaskRepeatChange (id, repeat) {
    syncTasks(tasks.map(function (t) {
      if (t.id !== id) return t
      return { ...t, repeat: repeat, lastReminded: null }
    }))
  }

  useEffect(function () {
    // 加载已保存的任务
    const saved = loadTasks()
    setTasks(saved)
    petConfigRef.current.tasks = saved

    if (window.utools) {
      window.utools.onPluginEnter(function () {
        if (!petRunningRef.current) {
          if (window.services && window.services.isPetRunning) {
            const running = window.services.isPetRunning()
            if (!running) window.services.createPetWindow(petConfigRef.current)
            petRunningRef.current = true
            setPetRunning(true)
          }
        }
      })

      window.utools.onPluginOut(function (isKill) {
        if (isKill && window.services) {
          window.services.closePetWindow()
          petRunningRef.current = false
          setPetRunning(false)
        }
      })
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = function (e) {
      setTheme(e.matches ? 'dark' : 'light')
    }
    darkModeQuery.addEventListener('change', handleThemeChange)
    return function () {
      darkModeQuery.removeEventListener('change', handleThemeChange)
    }
  }, [])

  return (
    <ThemeProvider theme={THEME_DIC[theme]}>
      <Box sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        p: 2,
        gap: 1.5,
        bgcolor: 'background.default'
      }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            spacing={1.5}
          >
            <Stack direction='row' alignItems='center' spacing={1.25}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: '#fff'
              }}
              >
                <HuskyIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant='h6' fontWeight={800} lineHeight={1.1}>
                  桌面哈士奇
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  会走会闹的桌面宠物
                </Typography>
              </Box>
            </Stack>

            <Button
              variant={petRunning ? 'outlined' : 'contained'}
              color={petRunning ? 'error' : 'primary'}
              size='small'
              startIcon={petRunning ? <StopIcon /> : <PlayArrowIcon />}
              onClick={petRunning ? stopPet : startPet}
              sx={{
                minWidth: 90,
                fontWeight: 700,
                borderRadius: 2,
                px: 1.5
              }}
            >
              {petRunning ? '停止' : '开始'}
            </Button>
          </Stack>
        </Paper>

        {/* 宠物行为设置 */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1} mb={1}>
            <PetsIcon fontSize='small' color='primary' />
            <Typography variant='body2' color='text.secondary' fontWeight={700}>
              行为
            </Typography>
          </Stack>

          <Stack spacing={1.25}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 0.5
            }}
            >
              <FormControlLabel
                control={<Switch
                  checked={followMouse}
                  onChange={handleFollowMouseChange}
                  size='small'
                />}
                label={<Typography variant='caption'>跟随鼠标</Typography>}
              />
              <FormControlLabel
                control={<Switch
                  checked={allowSleep}
                  onChange={handleAllowSleepChange}
                  size='small'
                />}
                label={<Typography variant='caption'>自动休眠</Typography>}
              />
              <FormControlLabel
                control={<Switch
                  checked={showOnStartup}
                  onChange={handleShowOnStartupChange}
                  size='small'
                />}
                label={<Typography variant='caption'>启动时显示</Typography>}
              />
            </Box>

            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' mb={0.5}>
                <Typography variant='caption' color='text.secondary' fontWeight={600}>
                  移动速度
                </Typography>
                <Typography variant='caption' color='primary' fontWeight={700}>
                  {petSpeed.toFixed(1)}×
                </Typography>
              </Stack>
              <Slider
                value={petSpeed}
                onChange={handlePetSpeedChange}
                min={0.5}
                max={2}
                step={0.1}
                size='small'
              />
            </Box>

            <Box>
              <Typography variant='caption' color='text.secondary' fontWeight={600} display='block' mb={0.5}>
                启动默认状态
              </Typography>
              <ToggleButtonGroup
                value={petDefaultState}
                exclusive
                onChange={handlePetDefaultStateChange}
                size='small'
                fullWidth
                sx={{
                  '& .MuiToggleButtonGroup-grouped': {
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    mx: '0 !important'
                  }
                }}
              >
                {PET_STATE_OPTIONS.map(function (item) {
                  return (
                    <ToggleButton key={item.value} value={item.value}>
                      {item.label}
                    </ToggleButton>
                  )
                })}
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Paper>

        {/* 定时任务 */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1} mb={1}>
            <AccessTimeIcon fontSize='small' color='warning' />
            <Typography variant='body2' color='text.secondary' fontWeight={700}>
              定时任务
            </Typography>
          </Stack>

          <Stack spacing={1.25}>
            <TextField
              size='small'
              fullWidth
              placeholder='例如：喝水、休息、开会...'
              value={newTaskContent}
              onChange={function (e) { setNewTaskContent(e.target.value) }}
              onKeyDown={function (e) { if (e.key === 'Enter') handleAddTask() }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <AlarmOnIcon fontSize='small' color='action' />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Stack direction='row' spacing={1}>
              <TextField
                size='small'
                type='time'
                value={newTaskTime}
                onChange={function (e) { setNewTaskTime(e.target.value) }}
                sx={{ width: 110 }}
              />
              <ToggleButtonGroup
                value={newTaskRepeat}
                exclusive
                onChange={function (e, v) { if (v) setNewTaskRepeat(v) }}
                size='small'
                sx={{ flex: 1 }}
              >
                {REPEAT_OPTIONS.map(function (item) {
                  return (
                    <ToggleButton key={item.value} value={item.value} sx={{ px: 1, py: 0.5, fontSize: '0.7rem' }}>
                      {item.label}
                    </ToggleButton>
                  )
                })}
              </ToggleButtonGroup>
            </Stack>

            <Button
              variant='contained'
              size='small'
              fullWidth
              onClick={handleAddTask}
              disabled={!newTaskContent.trim()}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              添加任务
            </Button>
          </Stack>

          {tasks.length > 0 && (
            <>
              <Divider sx={{ my: 1.25 }} />
              <List dense disablePadding>
                {tasks.map(function (task, index) {
                  return (
                    <ListItem
                      key={task.id}
                      disablePadding
                      sx={{
                        py: 0.5,
                        opacity: task.enabled ? 1 : 0.5,
                        borderBottom: index < tasks.length - 1 ? 1 : 0,
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='center' spacing={0.75}>
                            <Typography variant='body2' fontWeight={700} color={task.enabled ? 'text.primary' : 'text.disabled'}>
                              {task.time}
                            </Typography>
                            <Chip
                              label={getRepeatLabel(task.repeat)}
                              size='small'
                              variant='outlined'
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Stack>
                        }
                        secondary={
                          <Typography variant='caption' color={task.enabled ? 'text.secondary' : 'text.disabled'}>
                            {task.content}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                      <Stack direction='row' alignItems='center' spacing={0.5}>
                        <Switch
                          checked={task.enabled}
                          onChange={function () { handleToggleTask(task.id) }}
                          size='small'
                        />
                        <IconButton
                          size='small'
                          color='error'
                          onClick={function () { handleDeleteTask(task.id) }}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Stack>
                    </ListItem>
                  )
                })}
              </List>
            </>
          )}
        </Paper>

        {/* 宠物互动设置 */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1} mb={1}>
            <MouseIcon fontSize='small' color='secondary' />
            <Typography variant='body2' color='text.secondary' fontWeight={700}>
              互动
            </Typography>
          </Stack>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 0.5
          }}
          >
            <FormControlLabel
              control={<Switch
                checked={petClickFeedback}
                onChange={handlePetClickFeedbackChange}
                size='small'
              />}
              label={<Typography variant='caption'>点击反馈</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked
                  disabled
                  size='small'
                />
              }
              label={<Typography variant='caption' color='text.secondary'>拖拽移动</Typography>}
            />
          </Box>
        </Paper>

        {/* 宠物说明 */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant='body2' color='text.secondary' fontWeight={700} mb={0.5}>
            小提示
          </Typography>
          <Typography variant='caption' color='text.secondary' component='div'>
            • 开启「跟随鼠标」后，哈士奇会追着光标跑
          </Typography>
          <Typography variant='caption' color='text.secondary' component='div'>
            • 点击它会跳、叫或坐下
          </Typography>
          <Typography variant='caption' color='text.secondary' component='div'>
            • 按住它可以拖到屏幕任意位置
          </Typography>
          <Typography variant='caption' color='text.secondary' component='div'>
            • 设置定时任务后，到点哈士奇会弹出提醒
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  )
}
