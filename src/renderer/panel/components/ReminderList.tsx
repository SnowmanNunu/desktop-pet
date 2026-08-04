import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import type { Reminder } from '../../../shared/types'
import { reminderTimeLabel, reminderTypeLabel } from '../api'

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
  if (reminders.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        提醒列表（{reminders.length}）
      </Typography>
      <List dense disablePadding>
        {reminders.map((reminder) => (
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
              <Typography variant="caption" color="text.secondary">
                {reminderTypeLabel(reminder)}
                {reminderTimeLabel(reminder) ? ` · ${reminderTimeLabel(reminder)}` : ''}
              </Typography>
            </Stack>
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
