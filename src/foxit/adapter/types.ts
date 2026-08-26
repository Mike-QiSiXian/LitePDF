import type { ViewSnapshot } from '../controllers/ViewHistory'

export interface FoxitViewerAdapter {
  mount(host: HTMLElement): Promise<void>
  openFile(path: string, password?: string): Promise<void>
  saveTo(path: string): Promise<void>
  getFileName(): string
  captureViewState(): Promise<ViewSnapshot | null>
  restoreViewState(snapshot: ViewSnapshot): Promise<void>
  destroy(): Promise<void>
}

export interface AdapterCallbacks {
  onOpenRequest?: () => void
  onSaveRequest?: () => void
  onDirtyChange?: (dirty: boolean) => void
  onPasswordRequired?: () => Promise<string | null>
  onError?: (error: unknown) => void
}
