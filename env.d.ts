/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FOXIT_LICENSE_SN: string
  readonly VITE_FOXIT_LICENSE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface RecentFileItem {
  path: string
  name: string
  lastOpenedAt: number
  missing?: boolean
}

interface LitePdfApi {
  openPdfDialog: () => Promise<string[]>
  savePdfDialog: (defaultName?: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<Uint8Array>
  writeFile: (filePath: string, data: Uint8Array) => Promise<void>
  getRecentFiles: () => Promise<RecentFileItem[]>
  addRecentFile: (filePath: string) => Promise<RecentFileItem[]>
  removeRecentFile: (filePath: string) => Promise<RecentFileItem[]>
  clearRecentFiles: () => Promise<void>
  onOpenFiles: (callback: (paths: string[]) => void) => () => void
  getFoxitLibUrl: () => Promise<string>
  openPath?: (filePath: string) => Promise<string>
  getPathForFile: (file: File) => string
  platform: NodeJS.Platform | 'browser'
}

interface Window {
  litepdf: LitePdfApi
}
