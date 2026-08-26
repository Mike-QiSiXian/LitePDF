import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('litepdf', {
  openPdfDialog: () => ipcRenderer.invoke('dialog:openPdf') as Promise<string[]>,
  savePdfDialog: (defaultName?: string) =>
    ipcRenderer.invoke('dialog:savePdf', defaultName) as Promise<string | null>,
  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readFile', filePath) as Promise<Uint8Array>,
  writeFile: (filePath: string, data: Uint8Array) =>
    ipcRenderer.invoke('fs:writeFile', filePath, data) as Promise<void>,
  getRecentFiles: () => ipcRenderer.invoke('recent:list') as Promise<RecentFileItem[]>,
  addRecentFile: (filePath: string) =>
    ipcRenderer.invoke('recent:add', filePath) as Promise<RecentFileItem[]>,
  removeRecentFile: (filePath: string) =>
    ipcRenderer.invoke('recent:remove', filePath) as Promise<RecentFileItem[]>,
  clearRecentFiles: () => ipcRenderer.invoke('recent:clear') as Promise<void>,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  checkForUpdates: () =>
    ipcRenderer.invoke('update:check') as Promise<UpdateCheckResult>,
  downloadUpdate: (downloadUrl: string) =>
    ipcRenderer.invoke('update:download', downloadUrl) as Promise<void>,
  onUpdateAvailable: (callback: (result: UpdateCheckResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: UpdateCheckResult) =>
      callback(result)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onOpenFiles: (callback: (paths: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, paths: string[]) => callback(paths)
    ipcRenderer.on('open-files', handler)
    const saveHandler = () => window.dispatchEvent(new CustomEvent('litepdf:save'))
    ipcRenderer.on('menu:save', saveHandler)
    return () => {
      ipcRenderer.removeListener('open-files', handler)
      ipcRenderer.removeListener('menu:save', saveHandler)
    }
  },
  getFoxitLibUrl: () => ipcRenderer.invoke('foxit:libUrl') as Promise<string>,
  getFoxitExternalUrl: () => ipcRenderer.invoke('foxit:externalUrl') as Promise<string>,
  openPath: (filePath: string) =>
    ipcRenderer.invoke('shell:openPath', filePath) as Promise<string>,
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('shell:showItemInFolder', filePath) as Promise<void>,
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return (file as File & { path?: string }).path || ''
    }
  },
  platform: process.platform,
})
