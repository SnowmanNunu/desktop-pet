import React from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import App from './App'

function Root (): React.JSX.Element {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDark ? 'dark' : 'light',
          primary: { main: '#6366f1' }, // 靛蓝
          secondary: { main: '#f59e0b' }, // 琥珀
          info: { main: '#0ea5e9' },
          success: { main: '#10b981' },
          background: prefersDark
            ? { default: '#0f172a', paper: '#1e293b' }
            : { default: '#eef0fa', paper: '#ffffff' }
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily:
            '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: { backgroundImage: 'none' }
            }
          },
          MuiButton: {
            styleOverrides: {
              root: { textTransform: 'none', fontWeight: 600 }
            }
          },
          MuiChip: {
            styleOverrides: {
              root: { fontWeight: 600 }
            }
          }
        }
      }),
    [prefersDark]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
