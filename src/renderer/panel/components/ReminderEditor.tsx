import AddIcon from '@mui/icons-material/Add'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Reminder, ReminderType } from '../../../shared/types'

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

interface Props {
  onAdd: (reminder: Omit<Reminder, 'id'>) => void
}

function defaultDatetime (): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ReminderEditor ({ onAdd }: Props): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('daily')
  const [time, setTime] = useState('09:00')
  const [datetime, setDatetime] = useState(defaultDatetime)
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [intervalMinutes, setIntervalMinutes] = useState(45)

  const valid =
    title.trim().length > 0 &&
    (type !== 'weekly' || weekdays.length > 0) &&
    (type !== 'interval' || intervalMinutes >= 1)

  function handleAdd (): void {
    if (!valid) return
    const base = { title: title.trim(), enabled: true, lastFiredAt: null }
    switch (type) {
      case 'once':
        onAdd({ ...base, type, datetime })
        break
      case 'daily':
        onAdd({ ...base, type, time })
        break
      case 'weekly':
        onAdd({ ...base, type, time, weekdays: [...weekdays].sort() })
        break
      case 'interval':
        onAdd({ ...base, type, intervalMinutes })
        break
    }
    setTitle('')
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        添加提醒
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          size="small"
          fullWidth
          placeholder="提醒内容，如：起来活动一下"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <Stack direction="row" spacing={1}>
          <Select
            size="small"
            value={type}
            onChange={(e) => setType(e.target.value as ReminderType)}
            sx={{ minWidth: 110 }}
          >
            <MenuItem value="once">一次</MenuItem>
            <MenuItem value="daily">每天</MenuItem>
            <MenuItem value="weekly">每周</MenuItem>
            <MenuItem value="interval">间隔</MenuItem>
          </Select>

          {type === 'once' && (
            <TextField
              size="small"
              type="datetime-local"
              fullWidth
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
            />
          )}
          {(type === 'daily' || type === 'weekly') && (
            <TextField
              size="small"
              type="time"
              fullWidth
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          )}
          {type === 'interval' && (
            <TextField
              size="small"
              type="number"
              fullWidth
              label="分钟"
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value) || 1))}
            />
          )}
        </Stack>

        {type === 'weekly' && (
          <ToggleButtonGroup
            size="small"
            value={weekdays}
            onChange={(_e, v: number[]) => setWeekdays(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            {WEEKDAY_NAMES.map((name, i) => (
              <ToggleButton key={i} value={i} sx={{ flex: 1 }}>
                {name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          disabled={!valid}
          onClick={handleAdd}
        >
          添加
        </Button>
      </Stack>
    </Paper>
  )
}
