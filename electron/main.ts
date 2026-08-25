import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
} from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  addRecentFile,
  clearRecentFiles,
  getRecentFiles,
  removeRecentFile,
} from './ipc/recent-files'

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null
const pendingOpenFiles: string[] = []
const GITHUB_LATEST_RELEASE_API =
  'https://api.github.com/repos/Mike-QiSiXian/LitePDF/releases/latest'

interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  name?: string
  html_url: string
  body?: string
  published_at?: string
  assets?: GitHubReleaseAsset[]
}

interface UpdateCheckResult {
  status: 'available' | 'up-to-date' | 'unavailable' | 'error'
  currentVersion: string
  latestVersion?: string
  releaseName?: string
  releaseNotes?: string
  publishedAt?: string
  releaseUrl?: string
  downloadUrl?: string
  message: string
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '').split('-')[0]
}

function compareVersions(left: string, right: string) {
  const a = normalizeVersion(left).split('.').map((part) => Number(part) || 0)
  const b = normalizeVersion(right).split('.').map((part) => Number(part) || 0)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0)
    if (delta !== 0) return delta
  }
  return 0
}

function selectReleaseAsset(assets: GitHubReleaseAsset[] = []) {
  const arch = process.arch.toLowerCase()
  const candidates = assets.filter((asset) => {
    const name = asset.name.toLowerCase()
    if (process.platform === 'win32') return name.endsWith('.exe')
    if (process.platform === 'darwin') return name.endsWith('.dmg')
    return name.endsWith('.appimage') || name.endsWith('.deb') || name.endsWith('.rpm')
  })

  return (
    candidates.find((asset) => asset.name.toLowerCase().includes(arch)) ||
    candidates.find((asset) => /setup|installer/i.test(asset.name)) ||
    candidates[0]
  )
}

async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  try {
    const response = await net.fetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `LitePDF/${currentVersion}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (response.status === 404) {
      return {
        status: 'unavailable',
        currentVersion,
        message: 'GitHub 仓库暂未发布可供检查的正式版本。',
      }
    }
    if (!response.ok) throw new Error(`GitHub API 返回 ${response.status}`)

    const release = (await response.json()) as GitHubRelease
    const latestVersion = normalizeVersion(release.tag_name)
    const asset = selectReleaseAsset(release.assets)
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    return {
      status: hasUpdate ? 'available' : 'up-to-date',
      currentVersion,
      latestVersion,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      releaseUrl: release.html_url,
      downloadUrl: asset?.browser_download_url || release.html_url,
      message: hasUpdate ? `发现新版本 ${latestVersion}` : '当前已是最新版本。',
    }
  } catch (error) {
    return {
      status: 'error',
      currentVersion,
      message: error instanceof Error ? error.message : '检查更新失败',
    }
  }
}

function getPreloadPath() {
  return path.join(__dirname, 'preload.js')
}

function getFoxitLibDir() {
  if (isDev) {
    return path.join(app.getAppPath(), 'public', 'foxit-lib')
  }
  return path.join(process.resourcesPath, 'foxit-lib')
}

function getFoxitExternalDir() {
  if (isDev) {
    return path.join(app.getAppPath(), 'public', 'foxit-external')
  }
  return path.join(process.resourcesPath, 'foxit-external')
}

function getFoxitLibUrl() {
  if (isDev) {
    return `${process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'}/foxit-lib`
  }
  return 'app-foxit://lib'
}

function getFoxitExternalUrl() {
  if (isDev) {
    return `${process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'}/foxit-external`
  }
  return 'app-foxit://external'
}

try {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app-foxit',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
} catch {
  // hot-reload 场景可能重复注册
}

function createWindow() {
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'LitePDF',
    // 无边框标题栏：标签栏充当拖拽区；Win/Linux 用 overlay 保留系统按钮
    // 全宽依赖渲染进程 foxit-shell-reset，勿再使用 100vw
    frame: true,
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 12, y: 12 } }
      : {
          titleBarOverlay: {
            color: '#eef1f5',
            symbolColor: '#1f2329',
            height: 40,
          },
        }),
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  })

  // Windows/Linux：彻底隐藏窗口菜单栏（加速键仍由应用菜单模板保留在 macOS；Win 侧另行注册）
  if (!isMac) {
    mainWindow.setMenuBarVisibility(false)
  }

  const reveal = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (!mainWindow.isVisible()) mainWindow.show()
  }

  // ready-to-show 在部分 Windows / 热重启场景下不会触发，did-finish-load 作为兜底
  mainWindow.once('ready-to-show', reveal)
  mainWindow.webContents.once('did-finish-load', reveal)
  mainWindow.webContents.once('did-fail-load', () => {
    reveal()
  })
  setTimeout(reveal, 2500)

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    flushPendingOpenFiles()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  buildMenu()
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const files = await openPdfDialog()
            if (files.length) sendOpenFiles(files)
          },
        },
        {
          label: '保存…',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save')
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    // macOS 菜单在系统栏，不占窗口客户区；保留以便 Cmd+Q / 快捷键
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  } else {
    // Windows/Linux：不显示菜单栏；快捷键改由 before-input-event 处理
    Menu.setApplicationMenu(null)
    bindWindowShortcuts()
  }
}

function bindWindowShortcuts() {
  const win = mainWindow
  if (!win) return

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const ctrl = input.control || input.meta
    if (!ctrl) return
    const key = input.key.toLowerCase()
    if (key === 'o') {
      event.preventDefault()
      void openPdfDialog().then((files) => {
        if (files.length) sendOpenFiles(files)
      })
    } else if (key === 's') {
      event.preventDefault()
      win.webContents.send('menu:save')
    } else if (key === 'r' && !input.shift) {
      event.preventDefault()
      win.webContents.reload()
    } else if (key === 'i' && input.shift) {
      // Ctrl+Shift+I
      event.preventDefault()
      win.webContents.toggleDevTools()
    }
  })
}

async function openPdfDialog(): Promise<string[]> {
  if (!mainWindow) return []
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开 PDF',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  return result.canceled ? [] : result.filePaths
}

async function savePdfDialog(defaultName = 'document.pdf'): Promise<string | null> {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '另存为',
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  return result.canceled || !result.filePath ? null : result.filePath
}

function sendOpenFiles(paths: string[]) {
  const pdfs = paths.filter((p) => p.toLowerCase().endsWith('.pdf'))
  if (!pdfs.length) return
  if (mainWindow?.webContents.isLoading()) {
    pendingOpenFiles.push(...pdfs)
    return
  }
  mainWindow?.webContents.send('open-files', pdfs)
}

function flushPendingOpenFiles() {
  if (!pendingOpenFiles.length) return
  const files = pendingOpenFiles.splice(0, pendingOpenFiles.length)
  mainWindow?.webContents.send('open-files', files)
}

function registerIpc() {
  ipcMain.handle('dialog:openPdf', () => openPdfDialog())
  ipcMain.handle('dialog:savePdf', (_e, defaultName?: string) => savePdfDialog(defaultName))
  ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
    const buf = await fs.promises.readFile(filePath)
    return new Uint8Array(buf)
  })
  ipcMain.handle('fs:writeFile', async (_e, filePath: string, data: Uint8Array) => {
    await fs.promises.writeFile(filePath, Buffer.from(data))
  })
  ipcMain.handle('recent:list', () => getRecentFiles())
  ipcMain.handle('recent:add', (_e, filePath: string) => addRecentFile(filePath))
  ipcMain.handle('recent:remove', (_e, filePath: string) => removeRecentFile(filePath))
  ipcMain.handle('recent:clear', () => clearRecentFiles())
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', async (_e, downloadUrl: string) => {
    const url = new URL(downloadUrl)
    const allowedHosts = new Set([
      'github.com',
      'objects.githubusercontent.com',
      'github-releases.githubusercontent.com',
    ])
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
      throw new Error('无效的更新下载地址')
    }
    await shell.openExternal(url.toString())
  })
  ipcMain.handle('foxit:libUrl', () => getFoxitLibUrl())
  ipcMain.handle('foxit:externalUrl', () => getFoxitExternalUrl())
  ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
    if (!filePath) return 'empty path'
    return shell.openPath(filePath)
  })
  ipcMain.handle('shell:showItemInFolder', (_e, filePath: string) => {
    if (!filePath) return
    shell.showItemInFolder(filePath)
  })
}

function registerFoxitProtocol() {
  protocol.registerFileProtocol('app-foxit', (request, callback) => {
    try {
      const url = new URL(request.url)
      // app-foxit://lib/... → foxit-lib；app-foxit://external/... → foxit-external/brotli
      const host = url.hostname
      const base = host === 'external' ? getFoxitExternalDir() : getFoxitLibDir()
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const filePath = path.normalize(path.join(base, rel || 'index.html'))
      if (!filePath.startsWith(path.normalize(base))) {
        callback({ error: -6 })
        return
      }
      callback({ path: filePath })
    } catch {
      callback({ error: -2 })
    }
  })
}

const gotLock = isDev ? true : app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  if (!isDev) {
    app.on('second-instance', (_event, argv) => {
      const files = argv.filter((a) => a.toLowerCase().endsWith('.pdf'))
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        sendOpenFiles(files)
      } else {
        pendingOpenFiles.push(...files)
      }
    })
  }

  app.whenReady().then(() => {
    registerFoxitProtocol()
    registerIpc()
    createWindow()

    const launchFiles = process.argv.filter((a) => a.toLowerCase().endsWith('.pdf'))
    pendingOpenFiles.push(...launchFiles)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (app.isReady()) sendOpenFiles([filePath])
    else pendingOpenFiles.push(filePath)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  })
}
