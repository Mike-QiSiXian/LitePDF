import { app, BrowserWindow, session } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface UpdateProgress {
  phase: 'downloading' | 'installing'
  percent: number
  transferred: number
  total: number
}

const ALLOWED_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'github-releases.githubusercontent.com',
  'release-assets.githubusercontent.com',
])

function assertSafeDownloadUrl(downloadUrl: string) {
  const url = new URL(downloadUrl)
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('无效的更新下载地址')
  }
  return url
}

function sendProgress(payload: UpdateProgress) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:progress', payload)
  }
}

function fileNameFromUrl(url: URL) {
  const raw = decodeURIComponent(url.pathname.split('/').pop() || '')
  const name = raw.replace(/[^a-zA-Z0-9._-]+/g, '-')
  if (process.platform === 'win32' && name.toLowerCase().endsWith('.exe')) return name
  if (process.platform === 'darwin' && name.toLowerCase().endsWith('.dmg')) return name
  if (process.platform === 'win32') return 'LitePDF-Setup-update.exe'
  if (process.platform === 'darwin') return 'LitePDF-update.dmg'
  return name || 'LitePDF-update.bin'
}

function downloadToFile(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const sess = session.defaultSession
    const onWillDownload = (_event: Electron.Event, item: Electron.DownloadItem) => {
      item.setSavePath(dest)
      item.on('updated', (_e, state) => {
        if (state !== 'progressing' || item.isPaused()) return
        const transferred = item.getReceivedBytes()
        const total = item.getTotalBytes()
        const percent = total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0
        sendProgress({ phase: 'downloading', percent, transferred, total })
      })
      item.once('done', (_e, state) => {
        sess.off('will-download', onWillDownload)
        if (state === 'completed') {
          sendProgress({
            phase: 'installing',
            percent: 100,
            transferred: item.getReceivedBytes(),
            total: item.getTotalBytes(),
          })
          resolve()
          return
        }
        reject(new Error(state === 'cancelled' ? '已取消下载' : `下载失败：${state}`))
      })
    }
    sess.on('will-download', onWillDownload)
    sess.downloadURL(url)
  })
}

function launchWindowsInstaller(installerPath: string) {
  const child = spawn(installerPath, ['--updated', '/S'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    windowsVerbatimArguments: true,
  })
  child.unref()
}

function macAppBundlePath() {
  if (app.isPackaged) return path.resolve(process.execPath, '..', '..')
  return '/Applications/LitePDF.app'
}

async function launchMacInstaller(dmgPath: string) {
  const mount = path.join(os.tmpdir(), `litepdf-update-${Date.now()}`)
  const dest = macAppBundlePath()
  const scriptPath = path.join(os.tmpdir(), `litepdf-apply-update-${Date.now()}.sh`)
  const script = `#!/bin/bash
set -euo pipefail
sleep 2
hdiutil attach ${JSON.stringify(dmgPath)} -nobrowse -mountpoint ${JSON.stringify(mount)}
APP=$(ls -d ${JSON.stringify(mount)}/*.app | head -n 1)
if [ -z "$APP" ]; then
  hdiutil detach ${JSON.stringify(mount)} -force || true
  exit 1
fi
rm -rf ${JSON.stringify(dest)}
cp -R "$APP" ${JSON.stringify(dest)}
hdiutil detach ${JSON.stringify(mount)} -force || true
open ${JSON.stringify(dest)}
rm -f ${JSON.stringify(dmgPath)}
rm -f ${JSON.stringify(scriptPath)}
`
  await fs.promises.writeFile(scriptPath, script, { mode: 0o755 })
  const child = spawn('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

export async function downloadAndInstallUpdate(downloadUrl: string) {
  const url = assertSafeDownloadUrl(downloadUrl)

  const dest = path.join(os.tmpdir(), fileNameFromUrl(url))
  try {
    await fs.promises.unlink(dest)
  } catch {
    // ignore
  }

  sendProgress({ phase: 'downloading', percent: 0, transferred: 0, total: 0 })
  await downloadToFile(url.toString(), dest)

  if (process.platform === 'win32') {
    launchWindowsInstaller(dest)
    app.quit()
    return
  }

  if (process.platform === 'darwin') {
    await launchMacInstaller(dest)
    app.quit()
    return
  }

  throw new Error('当前系统暂不支持应用内自动安装更新')
}
