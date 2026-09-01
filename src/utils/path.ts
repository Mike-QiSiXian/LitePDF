export function basename(filePath: string) {
  return filePath.split(/[/\\]/).pop() || filePath
}

export function summarizePath(filePath: string, max = 56) {
  if (filePath.length <= max) return filePath
  const name = basename(filePath)
  const keep = Math.max(12, max - name.length - 3)
  return `${filePath.slice(0, keep)}…${name}`
}

type TimeLang = 'zh-CN' | 'en-US' | string

/** 夸克风格相对时间：今天/昨天 HH:mm，更早则显示日期 */
export function formatTime(ts: number, lang: TimeLang = 'zh-CN') {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''

  const locale = lang.startsWith('en') ? 'en-US' : 'zh-CN'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86400000)
  const hm = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)

  if (locale === 'en-US') {
    if (dayDiff === 0) return `Today ${hm}`
    if (dayDiff === 1) return `Yesterday ${hm}`
    if (d.getFullYear() === now.getFullYear()) {
      return `${d.getMonth() + 1}/${d.getDate()} ${hm}`
    }
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  if (dayDiff === 0) return `今天 ${hm}`
  if (dayDiff === 1) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function formatSize(bytes?: number) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let n = bytes / 1024
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  const digits = n >= 100 || i === 0 ? 0 : n >= 10 ? 1 : 2
  return `${n.toFixed(digits)} ${units[i]}`
}
