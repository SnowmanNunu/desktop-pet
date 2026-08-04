import { app } from 'electron'

export interface UpdateCheckResult {
  current: string
  latest: string | null
  url: string | null
  hasUpdate: boolean
  error?: string
}

const REPO = 'SnowmanNunu/desktop-pet'
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`
const GITEE_API = `https://gitee.com/api/v5/repos/${REPO}/releases/latest`

/** 比较语义化版本：a > b 返回 true */
function isNewer (a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

async function fetchLatest (url: string): Promise<{ tag: string; url: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'desktop-pet', Accept: 'application/json' },
      signal: controller.signal
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { tag_name?: string; html_url?: string }
    if (!data.tag_name) return null
    return {
      tag: data.tag_name,
      url: data.html_url ?? `https://github.com/${REPO}/releases`
    }
  } catch {
    return null
  }
}

/** 检查更新：先 GitHub，失败后回退 Gitee */
export async function checkForUpdates (): Promise<UpdateCheckResult> {
  const current = app.getVersion()
  const release =
    (await fetchLatest(GITHUB_API)) ?? (await fetchLatest(GITEE_API))

  if (!release) {
    return {
      current,
      latest: null,
      url: null,
      hasUpdate: false,
      error: '无法连接 release 服务，请检查网络后重试'
    }
  }

  return {
    current,
    latest: release.tag,
    url: release.url,
    hasUpdate: isNewer(release.tag, current)
  }
}
