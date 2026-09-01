import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  session,
  shell,
} from 'electron'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** 开发态：控制台切 UTF-8，避免 Chromium/Node 中文日志在 GBK 控制台乱码 */
function ensureDevUtf8Console() {
  if (process.platform !== 'win32' || app.isPackaged) return
  try {
    execSync('chcp 65001 >NUL', {
      stdio: 'ignore',
      windowsHide: true,
      shell: true,
    })
  } catch {
    // ignore
  }
}

ensureDevUtf8Console()
// 开发态降低 Chromium 原生 ERROR 刷屏（如 registration_protocol_win 本地化文案乱码）
if (!app.isPackaged) {
  app.commandLine.appendSwitch('log-level', '3')
}
import {
  getPdfAssociationStatus,
  registerPdfFileAssociation,
  setAsDefaultPdfHandler,
} from './file-association'
import {
  addRecentFile,
  clearRecentFiles,
  getRecentFiles,
  removeRecentFile,
} from './ipc/recent-files'
import { getUiLanguage, setUiLanguage, type UiLanguage } from './ipc/ui-settings'
import {
  mt,
  resolveStartupLanguage,
  setCurrentMenuLanguage,
} from './i18n-menu'
import { downloadAndInstallUpdate } from './install-update'
import { startLocalStaticServer, type LocalStaticServer } from './local-static-server'

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null
let localServer: LocalStaticServer | null = null
let localServerPromise: Promise<LocalStaticServer> | null = null
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

  if (process.platform === 'darwin') {
    return candidates.find((asset) => asset.name.toLowerCase().includes(arch))
  }

  return (
    candidates.find((asset) => asset.name.toLowerCase().includes(arch)) ||
    candidates.find((asset) => /setup|installer/i.test(asset.name)) ||
    candidates[0]
  )
}

function platformName() {
  if (process.platform === 'win32') return 'Windows'
  if (process.platform === 'darwin') return 'macOS'
  return 'Linux'
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

    if (hasUpdate && !asset) {
      return {
        status: 'unavailable',
        currentVersion,
        latestVersion,
        releaseName: release.name || release.tag_name,
        releaseNotes: release.body || '',
        publishedAt: release.published_at,
        releaseUrl: release.html_url,
        message: `发现新版本 ${latestVersion}，但暂未提供适用于 ${platformName()} ${process.arch} 的安装包。`,
      }
    }

    return {
      status: hasUpdate ? 'available' : 'up-to-date',
      currentVersion,
      latestVersion,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      releaseUrl: release.html_url,
      downloadUrl: hasUpdate ? asset?.browser_download_url : undefined,
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

function scheduleSilentUpdateCheck(win: BrowserWindow) {
  if (!app.isPackaged) return
  setTimeout(async () => {
    if (win.isDestroyed()) return
    const result = await checkForUpdates()
    if (result.status === 'available' && result.downloadUrl && !win.isDestroyed()) {
      win.webContents.send('update:available', result)
    }
  }, 4000)
}

function getPreloadPath() {
  return path.join(__dirname, 'preload.js')
}

function getWindowIconPath() {
  return isDev
    ? path.join(app.getAppPath(), 'resources', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png')
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

function getDistDir() {
  return path.join(__dirname, '../dist')
}

async function ensureLocalServer() {
  if (localServer) return localServer
  if (!localServerPromise) {
    localServerPromise = startLocalStaticServer({
      distDir: getDistDir(),
      foxitLibDir: getFoxitLibDir(),
    }).then((server) => {
      localServer = server
      return server
    })
  }
  return localServerPromise
}

async function getFoxitLibUrl() {
  if (isDev) {
    return `${process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'}/foxit-lib`
  }
  const server = await ensureLocalServer()
  return `${server.origin}/foxit-lib`
}

async function getFoxitWorkerLibUrl() {
  return getFoxitLibUrl()
}

async function getAppEntryUrl() {
  if (isDev) {
    return process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  }
  const server = await ensureLocalServer()
  return server.origin
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
    icon: getWindowIconPath(),
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
    void getAppEntryUrl().then((origin) => {
      mainWindow?.loadURL(`${origin}/`)
    })
  }

  mainWindow.webContents.on('did-finish-load', () => {
    flushPendingOpenFiles()
    scheduleSilentUpdateCheck(mainWindow!)
  })

  // 从系统「默认应用」设置返回后，刷新 PDF 关联状态，避免按钮仍可重复点击
  mainWindow.on('focus', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('pdfAssoc:changed')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  buildMenu()
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: mt('file'),
      submenu: [
        {
          label: mt('open'),
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const files = await openPdfDialog()
            if (files.length) sendOpenFiles(files)
          },
        },
        {
          label: mt('save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save')
          },
        },
        {
          label: mt('setDefaultPdf'),
          click: () => {
            mainWindow?.webContents.send('menu:set-default-pdf')
          },
        },
        { type: 'separator' },
        { role: 'quit', label: mt('quit') },
      ],
    },
    {
      label: mt('view'),
      submenu: [
        { role: 'reload', label: mt('reload') },
        { role: 'toggleDevTools', label: mt('toggleDevTools') },
        { type: 'separator' },
        { role: 'resetZoom', label: mt('resetZoom') },
        { role: 'zoomIn', label: mt('zoomIn') },
        { role: 'zoomOut', label: mt('zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: mt('toggleFullscreen') },
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
    title: mt('openPdfTitle'),
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  return result.canceled ? [] : result.filePaths
}

async function savePdfDialog(defaultName = 'document.pdf'): Promise<string | null> {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    title: mt('saveAsTitle'),
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
  ipcMain.handle('settings:getUiLanguage', () => getUiLanguage())
  ipcMain.handle('settings:setUiLanguage', async (_e, language: unknown) => {
    await setUiLanguage(language)
    if (language === 'zh-CN' || language === 'en-US') {
      setCurrentMenuLanguage(language as UiLanguage)
      buildMenu()
    }
  })
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', async (_e, downloadUrl: string) => {
    await downloadAndInstallUpdate(downloadUrl)
  })
  ipcMain.handle('foxit:libUrl', () => getFoxitLibUrl())
  ipcMain.handle('foxit:workerLibUrl', () => getFoxitWorkerLibUrl())
  ipcMain.handle('foxit:externalUrl', () => getFoxitExternalUrl())
  ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
    if (!filePath) return 'empty path'
    return shell.openPath(filePath)
  })
  ipcMain.handle('shell:showItemInFolder', (_e, filePath: string) => {
    if (!filePath) return
    shell.showItemInFolder(filePath)
  })
  ipcMain.handle('pdfAssoc:status', () => getPdfAssociationStatus())
  ipcMain.handle('pdfAssoc:register', () => registerPdfFileAssociation())
  ipcMain.handle('pdfAssoc:setDefault', () => setAsDefaultPdfHandler())
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

  app.whenReady().then(async () => {
    // Local Font Access：缺省允许，避免运行时弹「询问」导致未嵌入字体的 PDF 缺字
    const ses = session.defaultSession
    ses.setPermissionCheckHandler((_wc, permission) => {
      if (permission === 'local-fonts') return true
      return true
    })
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'local-fonts') {
        callback(true)
        return
      }
      callback(true)
    })

    if (!isDev) await ensureLocalServer()
    await resolveStartupLanguage()
    registerFoxitProtocol()
    registerIpc()
    void registerPdfFileAssociation().catch(() => undefined)
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

  app.on('will-quit', () => {
    void localServer?.close()
  })

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  })
}
