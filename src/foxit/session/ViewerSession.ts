import { createFoxitViewerAdapter } from '../adapter/FoxitViewerAdapter'
import type { FoxitViewerAdapter } from '../adapter/types'

export class ViewerSession {
  readonly id: string
  readonly path: string
  private adapter: FoxitViewerAdapter | null = null
  private mounted = false
  private host: HTMLElement | null = null

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

  async ensureMounted(host: HTMLElement) {
    this.host = host
    if (this.mounted && this.adapter) return
    this.adapter = createFoxitViewerAdapter({
      onOpenRequest: this.hooks.onOpenRequest,
      onSaveRequest: this.hooks.onSaveRequest,
      onDirtyChange: this.hooks.onDirtyChange,
      onPasswordRequired: this.hooks.onPasswordRequired,
      onError: this.hooks.onError,
    })
    await this.adapter.mount(host)
    await this.adapter.openFile(this.path)
    this.mounted = true
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
    this.host = null
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
