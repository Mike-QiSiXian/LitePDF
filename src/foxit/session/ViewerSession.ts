import { createFoxitViewerAdapter } from '../adapter/FoxitViewerAdapter'
import type { FoxitViewerAdapter } from '../adapter/types'
import type { ViewSnapshot } from '../controllers/ViewHistory'

export class ViewerSession {
  readonly id: string
  readonly path: string
  private adapter: FoxitViewerAdapter | null = null
  private mounted = false
  private opened = false
  private host: HTMLElement | null = null
  private mountPromise: Promise<void> | null = null
  private openPromise: Promise<void> | null = null
  private savedViewState: ViewSnapshot | null = null

  constructor(
    id: string,
    path: string,
    private readonly hooks: {
      onOpenRequest: () => void
      onSaveRequest: () => void
      onDirtyChange: (dirty: boolean) => void
      onPasswordRequired: () => Promise<string | null>
      onError: (error: unknown) => void
    },
  ) {
    this.id = id
    this.path = path
  }

  async ensureViewer(host: HTMLElement) {
    this.host = host
    if (this.mounted && this.adapter) return
    // 并发打开时共用同一次 mount，避免 adapter 已创建但 pdfui 未就绪时提前 openFile
    if (!this.mountPromise) {
      this.mountPromise = (async () => {
        if (!this.adapter) {
          this.adapter = createFoxitViewerAdapter({
            onOpenRequest: this.hooks.onOpenRequest,
            onSaveRequest: this.hooks.onSaveRequest,
            onDirtyChange: this.hooks.onDirtyChange,
            onPasswordRequired: this.hooks.onPasswordRequired,
            onError: this.hooks.onError,
          })
        }
        await this.adapter.mount(host)
        this.mounted = true
      })()
    }
    try {
      await this.mountPromise
    } catch (e) {
      this.mountPromise = null
      this.adapter = null
      this.mounted = false
      throw e
    }
  }

  async ensureDocument() {
    if (!this.adapter || !this.mounted) {
      throw new Error('请先初始化查看器')
    }
    if (this.opened) return
    if (!this.openPromise) {
      this.openPromise = this.adapter.openFile(this.path).then(() => {
        this.opened = true
      })
    }
    try {
      await this.openPromise
    } catch (e) {
      this.openPromise = null
      this.opened = false
      throw e
    }
  }

  async ensureMounted(host: HTMLElement) {
    await this.ensureViewer(host)
    await this.ensureDocument()
  }

  isReady() {
    return this.mounted && this.opened
  }

  async captureViewState() {
    if (!this.adapter || !this.opened) return
    try {
      const snap = await this.adapter.captureViewState()
      if (snap) this.savedViewState = snap
    } catch {
      // ignore
    }
  }

  async restoreViewState() {
    if (!this.savedViewState || !this.adapter || !this.opened) return
    try {
      await this.adapter.restoreViewState(this.savedViewState)
    } catch {
      // ignore
    }
  }

  async saveAs(filePath: string) {
    if (!this.adapter) throw new Error('会话尚未初始化')
    await this.adapter.saveTo(filePath)
  }

  getFileName() {
    return this.adapter?.getFileName() || this.path.split(/[/\\]/).pop() || 'document.pdf'
  }

  async destroy() {
    await this.adapter?.destroy()
    this.adapter = null
    this.mounted = false
    this.opened = false
    this.mountPromise = null
    this.openPromise = null
    this.host = null
    this.savedViewState = null
  }
}

export class ViewerSessionManager {
  private sessions = new Map<string, ViewerSession>()

  get(id: string) {
    return this.sessions.get(id)
  }

  create(
    id: string,
    path: string,
    hooks: ConstructorParameters<typeof ViewerSession>[2],
  ) {
    const existing = this.sessions.get(id)
    if (existing) return existing
    const session = new ViewerSession(id, path, hooks)
    this.sessions.set(id, session)
    return session
  }

  async close(id: string) {
    const session = this.sessions.get(id)
    if (!session) return
    await session.destroy()
    this.sessions.delete(id)
  }

  async closeAll() {
    await Promise.all([...this.sessions.keys()].map((id) => this.close(id)))
  }
}
