import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import type { PetConfig } from '../../../shared/types'

interface Props {
  config: PetConfig
  onChange: (patch: Partial<PetConfig>) => void
}

export default function PetSettings ({ config, onChange }: Props): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        宠物设置
      </Typography>
      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.followMouse}
              onChange={(e) => onChange({ followMouse: e.target.checked })}
            />
          }
          label="跟随鼠标"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.allowSleep}
              onChange={(e) => onChange({ allowSleep: e.target.checked })}
            />
          }
          label="自动休眠"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.clickFeedback}
              onChange={(e) => onChange({ clickFeedback: e.target.checked })}
            />
          }
          label="点击反馈"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.clickThrough}
              onChange={(e) => onChange({ clickThrough: e.target.checked })}
            />
          }
          label="鼠标穿透（纯观赏，不挡操作）"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.reminderSound}
              onChange={(e) => onChange({ reminderSound: e.target.checked })}
            />
          }
          label="提醒提示音"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.showOnStartup}
              onChange={(e) => onChange({ showOnStartup: e.target.checked })}
            />
          }
          label="启动时显示"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.autoStart}
              onChange={(e) => onChange({ autoStart: e.target.checked })}
            />
          }
          label="开机自启动"
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ minWidth: 64 }}>
            宠物大小
          </Typography>
          <Slider
            size="small"
            min={0.5}
            max={2}
            step={0.1}
            value={config.petScale}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}×`}
            onChange={(_e, v) => onChange({ petScale: v as number })}
          />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ minWidth: 64 }}>
            移动速度
          </Typography>
          <Slider
            size="small"
            min={0.5}
            max={2}
            step={0.1}
            value={config.speed}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}×`}
            onChange={(_e, v) => onChange({ speed: v as number })}
          />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ minWidth: 64 }}>
            气泡时长
          </Typography>
          <Slider
            size="small"
            min={0}
            max={30}
            step={1}
            value={config.bubbleDuration}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => (v === 0 ? '常驻' : `${v}s`)}
            onChange={(_e, v) => onChange({ bubbleDuration: v as number })}
          />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ minWidth: 64 }}>
            默认状态
          </Typography>
          <Select
            size="small"
            fullWidth
            value={config.defaultState}
            onChange={(e) =>
              onChange({ defaultState: e.target.value as PetConfig['defaultState'] })
            }
          >
            <MenuItem value="idle">待机</MenuItem>
            <MenuItem value="sit">坐下</MenuItem>
            <MenuItem value="sleep">睡觉</MenuItem>
          </Select>
        </Stack>
      </Stack>
    </Paper>
  )
}
