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
  sizeBytes?: number
}

interface PdfAssociationStatus {
  packaged: boolean
  registered: boolean
  isDefault: boolean
  canSetDefault: boolean
  platform: string
  message: string
}

interface SetDefaultPdfResult {
  ok: boolean
  isDefault: boolean
  openedSystemSettings: boolean
  message: string
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

interface LitePdfApi {
  openPdfDialog: () => Promise<string[]>
  savePdfDialog: (defaultName?: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<Uint8Array>
  writeFile: (filePath: string, data: Uint8Array) => Promise<void>
  getRecentFiles: () => Promise<RecentFileItem[]>
  addRecentFile: (filePath: string) => Promise<RecentFileItem[]>
  removeRecentFile: (filePath: string) => Promise<RecentFileItem[]>
  clearRecentFiles: () => Promise<void>
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<UpdateCheckResult>
  downloadUpdate: (downloadUrl: string) => Promise<void>
  onUpdateAvailable: (callback: (result: UpdateCheckResult) => void) => () => void
  onOpenFiles: (callback: (paths: string[]) => void) => () => void
  getFoxitLibUrl: () => Promise<string>
  getFoxitWorkerLibUrl: () => Promise<string>
  getFoxitExternalUrl: () => Promise<string>
  openPath?: (filePath: string) => Promise<string>
  showItemInFolder?: (filePath: string) => Promise<void>
  getPdfAssociationStatus?: () => Promise<PdfAssociationStatus>
  setAsDefaultPdfHandler?: () => Promise<SetDefaultPdfResult>
  onSetDefaultPdf?: (callback: () => void) => () => void
  onPdfAssociationChanged?: (callback: () => void) => () => void
  getPathForFile: (file: File) => string
  platform: NodeJS.Platform | 'browser'
}

interface Window {
  litepdf: LitePdfApi
}
