import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export interface RecentFileRecord {
  path: string
  name: string
  lastOpenedAt: number
}

export interface RecentFileItem extends RecentFileRecord {
  missing?: boolean
}

const MAX_RECENT = 20

function storePath() {
  return path.join(app.getPath('userData'), 'recent-files.json')
}

function readStore(): RecentFileRecord[] {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeStore(items: RecentFileRecord[]) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true })
  fs.writeFileSync(storePath(), JSON.stringify(items, null, 2), 'utf8')
}

export function getRecentFiles(): RecentFileItem[] {
  return readStore().map((item) => ({
    ...item,
    missing: !fs.existsSync(item.path),
  }))
}

export function addRecentFile(filePath: string): RecentFileItem[] {
  const name = path.basename(filePath)
  const next: RecentFileRecord[] = [
    { path: filePath, name, lastOpenedAt: Date.now() },
    ...readStore().filter((item) => item.path !== filePath),
  ].slice(0, MAX_RECENT)
  writeStore(next)
  return getRecentFiles()
}

export function removeRecentFile(filePath: string): RecentFileItem[] {
  writeStore(readStore().filter((item) => item.path !== filePath))
  return getRecentFiles()
}

export function clearRecentFiles(): void {
  writeStore([])
}
