import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
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

function getPreloadPath() {
  return path.join(__dirname, 'preload.js')
}

function getFoxitLibDir() {
  if (isDev) {
    return path.join(app.getAppPath(), 'public', 'foxit-lib')
  }
  return path.join(process.resourcesPath, 'foxit-lib')
}

function getFoxitLibUrl() {
  if (isDev) {
    return `${process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'}/foxit-lib`
  }
  return 'app-foxit://lib'
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

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
  ipcMain.handle('foxit:libUrl', () => getFoxitLibUrl())
  ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
    if (!filePath) return 'empty path'
    return shell.openPath(filePath)
  })
}

function registerFoxitProtocol() {
  protocol.registerFileProtocol('app-foxit', (request, callback) => {
    try {
      const url = new URL(request.url)
      // app-foxit://lib/UIExtension.full.js → host=lib, pathname=/UIExtension.full.js
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const base = getFoxitLibDir()
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

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
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
