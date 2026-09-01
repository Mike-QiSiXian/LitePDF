/**
 * 浏览器调试替身：无 Electron preload 时注入 window.litepdf，
 * 便于在 http://localhost:5173 直接点「打开 PDF」调试。
 */

import packageJson from '../../package.json'

const RECENT_KEY = 'litepdf.browser.recent'
const MAX_RECENT = 20
const fileStore = new Map<string, File>()

function isPdfName(name: string) {
  return name.toLowerCase().endsWith('.pdf')
}

function basename(filePath: string) {
  return filePath.split(/[/\\]/).pop() || filePath
}

function virtualPathFor(file: File) {
  // 同名文件用时间戳区分，避免覆盖
  const safe = file.name.replace(/[^\w.\u4e00-\u9fff-]+/g, '_')
  return `browser://${Date.now()}-${safe}`
}

function rememberFile(file: File, preferredPath?: string) {
  const path = preferredPath || virtualPathFor(file)
  fileStore.set(path, file)
  return path
}

function readRecent(): RecentFileItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? (JSON.parse(raw) as RecentFileItem[]) : []
    return list.map((item) => {
      const file = fileStore.get(item.path)
      return {
        ...item,
        missing: !file,
        sizeBytes: file?.size,
      }
    })
  } catch {
    return []
  }
}

function writeRecent(items: RecentFileItem[]) {
  const plain = items.map(({ path, name, lastOpenedAt }) => ({ path, name, lastOpenedAt }))
  localStorage.setItem(RECENT_KEY, JSON.stringify(plain.slice(0, MAX_RECENT)))
}

function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,.pdf'
    input.multiple = multiple
    input.style.display = 'none'
    input.addEventListener('change', () => {
      const files = [...(input.files || [])].filter((f) => isPdfName(f.name))
      input.remove()
      resolve(files)
    })
    input.addEventListener('cancel', () => {
      input.remove()
      resolve([])
    })
    document.body.appendChild(input)
    input.click()
  })
}

function downloadBytes(filePath: string, data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  const blob = new Blob([copy], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = basename(filePath) || 'document.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

function displayName(filePath: string) {
  const raw = basename(filePath.replace(/^browser(-save)?:\/\//, ''))
  return raw.replace(/^\d+-/, '')
}

export function installBrowserLitePdfShim() {
  if (window.litepdf) return false

  console.info(
    '[LitePDF] 浏览器调试模式：已注入 window.litepdf 替身。完整能力请用 Electron（npm run dev 启动的桌面窗口）。',
  )

  window.litepdf = {
    async openPdfDialog() {
      const files = await pickFiles(true)
      return files.map((f) => rememberFile(f))
    },

    async savePdfDialog(defaultName = 'document.pdf') {
      const name = window.prompt('另存为文件名（浏览器将触发下载）', defaultName)
      if (!name) return null
      return isPdfName(name) ? `browser-save://${name}` : `browser-save://${name}.pdf`
    },

    async readFile(filePath: string) {
      const file = fileStore.get(filePath)
      if (!file) {
        throw new Error(
          '浏览器模式下无法再次读取该路径（刷新后需重新选择文件）。请重新「打开 PDF」。',
        )
      }
      const buf = await file.arrayBuffer()
      return new Uint8Array(buf)
    },

    async writeFile(filePath: string, data: Uint8Array) {
      const name = displayName(filePath)
      downloadBytes(name, data)
      const copy = new Uint8Array(data.byteLength)
      copy.set(data)
      rememberFile(new File([copy], name, { type: 'application/pdf' }), filePath)
    },

    async getRecentFiles() {
      return readRecent()
    },

    async addRecentFile(filePath: string) {
      const next: RecentFileItem[] = [
        {
          path: filePath,
          name: displayName(filePath),
          lastOpenedAt: Date.now(),
        },
        ...readRecent().filter((item) => item.path !== filePath),
      ].slice(0, MAX_RECENT)
      writeRecent(next)
      return readRecent()
    },

    async removeRecentFile(filePath: string) {
      writeRecent(readRecent().filter((item) => item.path !== filePath))
      fileStore.delete(filePath)
      return readRecent()
    },

    async clearRecentFiles() {
      writeRecent([])
    },

    async getAppVersion() {
      return packageJson.version
    },

    async checkForUpdates() {
      return {
        status: 'unavailable',
        currentVersion: packageJson.version,
        message: '浏览器调试模式不支持检查桌面客户端更新。',
      }
    },

    async downloadUpdate(downloadUrl: string) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    },

    onUpdateAvailable() {
      return () => undefined
    },

    onOpenFiles() {
      return () => undefined
    },

    async getFoxitLibUrl() {
      return `${window.location.origin}/foxit-lib`
    },

    async getFoxitWorkerLibUrl() {
      return `${window.location.origin}/foxit-lib`
    },

    async getFoxitExternalUrl() {
      return `${window.location.origin}/foxit-external`
    },

    async openPath(filePath: string) {
      if (!filePath) return 'empty path'
      const file = fileStore.get(filePath)
      if (file) {
        const url = URL.createObjectURL(file)
        window.open(url, '_blank')
        return ''
      }
      window.open(`file:///${filePath.replace(/\\/g, '/')}`, '_blank')
      return ''
    },

    async showItemInFolder() {
      // 浏览器模式无系统资源管理器
    },

    async getPdfAssociationStatus() {
      return {
        packaged: false,
        registered: false,
        isDefault: false,
        canSetDefault: false,
        platform: 'browser',
        message: '浏览器调试模式不支持系统文件关联。',
      }
    },

    async setAsDefaultPdfHandler() {
      return {
        ok: false,
        isDefault: false,
        openedSystemSettings: false,
        message: '浏览器调试模式无法设置默认 PDF 应用。',
      }
    },

    onSetDefaultPdf() {
      return () => undefined
    },

    onPdfAssociationChanged() {
      return () => undefined
    },

    getPathForFile(file: File) {
      if (!isPdfName(file.name)) return ''
      return rememberFile(file)
    },

    platform: 'browser',
  }

  return true
}

export function isBrowserDebugMode() {
  return !!(window.litepdf && String(window.litepdf.platform) === 'browser')
}
