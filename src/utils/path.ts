export function basename(filePath: string) {
  return filePath.split(/[/\\]/).pop() || filePath
}

export function summarizePath(filePath: string, max = 56) {
  if (filePath.length <= max) return filePath
  const name = basename(filePath)
  const keep = Math.max(12, max - name.length - 3)
  return `${filePath.slice(0, keep)}…${name}`
}

export function formatTime(ts: number) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}
