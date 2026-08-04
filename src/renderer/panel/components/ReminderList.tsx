import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import type { Reminder, ReminderType } from '../../../shared/types'
import { reminderTimeLabel, reminderTypeLabel } from '../api'

/** 提醒类型配色 */
const TYPE_COLORS: Record<ReminderType, string> = {
  once: '#8b5cf6',
  daily: '#0ea5e9',
  weekly: '#10b981',
  interval: '#f59e0b'
}

function TypeChip ({ reminder }: { reminder: Reminder }): React.JSX.Element {
  const color = TYPE_COLORS[reminder.type]
  return (
    <Chip
      size="small"
      label={reminderTypeLabel(reminder)}
      sx={{
        bgcolor: `${color}1f`,
        color,
        fontWeight: 700,
        fontSize: 11,
        height: 20
      }}
    />
  )
}

interface Props {
  reminders: Reminder[]
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export default function ReminderList ({
  reminders,
  onToggle,
  onDelete
}: Props): React.JSX.Element | null {
  // transient 为内部任务（稍后提醒等），不在列表显示
  const visible = reminders.filter((r) => !r.transient)
  if (visible.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom fontWeight={700}>
        📋 提醒列表（{visible.length}）
      </Typography>
      <List dense disablePadding>
        {visible.map((reminder) => (
          <ListItem
            key={reminder.id}
            disableGutters
            sx={{ opacity: reminder.enabled ? 1 : 0.5 }}
            secondaryAction={
              <Stack direction="row" alignItems="center">
                <Switch
                  size="small"
                  checked={reminder.enabled}
                  onChange={(e) => onToggle(reminder.id, e.target.checked)}
                />
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => onDelete(reminder.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
          >
            <Stack>
              <Typography
                variant="body2"
                fontWeight={600}
                color={reminder.enabled ? 'text.primary' : 'text.disabled'}
              >
                {reminder.title}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                <TypeChip reminder={reminder} />
                {reminder.sticky === true && (
                  <Chip
                    size="small"
                    label="重要"
                    sx={{
                      bgcolor: '#ef44441f',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: 11,
                      height: 20
                    }}
                  />
                )}
                {reminderTimeLabel(reminder) && (
                  <Typography variant="caption" color="text.secondary">
                    {reminderTimeLabel(reminder)}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
