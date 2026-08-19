/**
 * 视图历史（页码 + 缩放 + 旋转 + 视图模式）：「上一视图 / 下一视图」
 *
 * 视图模式还原：pdfViewer.getViewModeManager().switchTo(name)
 * @see https://support.fuxinsoft.cn/?p=3899
 */

export type ViewSnapshot = {
  pageIndex: number
  scale: number
  rotation: number
  /** 如 continuous-view-mode / single-page-view-mode */
  viewMode: string
}

type ButtonHost = {
  prev?: any
  next?: any
}

type SnapshotHint = Partial<ViewSnapshot>

const MAX_STACK = 64
const LOG = '[LitePDF:ViewNav]'
const DEFAULT_VIEW_MODE = 'continuous-view-mode'

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.001
}

function sameSnapshot(a: ViewSnapshot, b: ViewSnapshot) {
  return (
    a.pageIndex === b.pageIndex &&
    nearlyEqual(a.scale, b.scale) &&
    a.rotation === b.rotation &&
    a.viewMode === b.viewMode
  )
}

function resolveViewerEvents(UIExtension: any) {
  const fromUix =
    UIExtension?.PDFViewCtrl?.constants?.ViewerEvents ||
    UIExtension?.PDFViewCtrl?.ViewerEvents
  const fromGlobal =
    (typeof window !== 'undefined' &&
      ((window as any).PDFViewCtrl?.constants?.ViewerEvents ||
        (window as any).UIExtension?.PDFViewCtrl?.constants?.ViewerEvents)) ||
    null
  return fromUix || fromGlobal || {}
}

function readViewModeName(viewer: any, hintName?: string): string {
  if (hintName && typeof hintName === 'string' && hintName.trim()) {
    return hintName.trim()
  }
  try {
    const mgr = viewer.getViewModeManager?.()
    const cur = mgr?.getCurrentViewMode?.() || viewer.getCurrentViewMode?.()
    const name = cur?.getName?.()
    if (typeof name === 'string' && name) return name
  } catch {
    // ignore
  }
  return DEFAULT_VIEW_MODE
}

async function readSnapshot(pdfui: any, hint: SnapshotHint = {}): Promise<ViewSnapshot | null> {
  try {
    const viewer = await pdfui.getPDFViewer?.()
    if (!viewer) return null

    let pageIndex =
      hint.pageIndex != null && Number.isFinite(hint.pageIndex)
        ? Number(hint.pageIndex)
        : Number.NaN

    if (!Number.isFinite(pageIndex)) {
      pageIndex = Number(viewer.getCurrentPageIndex?.())
      if (!Number.isFinite(pageIndex)) {
        const viewMode = viewer.getCurrentViewMode?.()
        pageIndex = Number(viewMode?.getCurrentPageIndex?.())
      }
      if (!Number.isFinite(pageIndex)) {
        const render = await viewer.getPDFDocRender?.()
        pageIndex = Number(render?.getCurrentPageIndex?.() ?? 0)
      }
    }
    if (!Number.isFinite(pageIndex) || pageIndex < 0) pageIndex = 0

    let scale =
      hint.scale != null && Number.isFinite(hint.scale) ? Number(hint.scale) : Number.NaN
    if (!Number.isFinite(scale) || scale <= 0) {
      scale = Number(viewer.getScale?.())
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      const render = await viewer.getPDFDocRender?.()
      scale = Number(render?.getScale?.() ?? 1)
    }
    if (!Number.isFinite(scale) || scale <= 0) scale = 1

    let rotation =
      hint.rotation != null && Number.isFinite(hint.rotation)
        ? Number(hint.rotation)
        : Number.NaN
    if (!Number.isFinite(rotation)) {
      rotation = Number(viewer.getRotation?.())
    }
    if (!Number.isFinite(rotation)) {
      const render = await viewer.getPDFDocRender?.()
      rotation = Number(render?.getRotation?.() ?? 0)
    }
    if (!Number.isFinite(rotation)) rotation = 0

    const viewMode = readViewModeName(viewer, hint.viewMode)

    return { pageIndex, scale, rotation, viewMode }
  } catch (e) {
    console.warn(LOG, 'readSnapshot failed', e)
    return null
  }
}

async function applySnapshot(pdfui: any, snap: ViewSnapshot) {
  const viewer = await pdfui.getPDFViewer?.()
  if (!viewer) return

  // 1) 先还原视图模式（单页/连续/对开等）
  // @see https://support.fuxinsoft.cn/?p=3899
  try {
    if (snap.viewMode) {
      const mgr = viewer.getViewModeManager?.()
      const curName = readViewModeName(viewer)
      if (mgr?.switchTo && curName !== snap.viewMode) {
        await mgr.switchTo(snap.viewMode)
      }
    }
  } catch (e) {
    console.warn(LOG, 'switchTo viewMode failed', snap.viewMode, e)
  }

  // 2) 缩放
  try {
    if (typeof viewer.zoomTo === 'function') {
      const currentScale = Number(
        viewer.getScale?.() ?? (await viewer.getPDFDocRender?.())?.getScale?.() ?? 1,
      )
      if (!nearlyEqual(currentScale, snap.scale)) {
        await viewer.zoomTo(snap.scale, { pageIndex: snap.pageIndex })
      }
    }
  } catch {
    try {
      await viewer.zoomTo?.(snap.scale)
    } catch {
      // ignore
    }
  }

  // 3) 旋转
  try {
    const currentRot = Number(viewer.getRotation?.() ?? 0)
    if (snap.rotation !== currentRot && typeof viewer.rotateTo === 'function') {
      await viewer.rotateTo(snap.rotation)
    }
  } catch {
    // ignore
  }

  // 4) 页码
  try {
    if (typeof viewer.goToPage === 'function') {
      await viewer.goToPage(snap.pageIndex)
    } else if (typeof pdfui.goToPage === 'function') {
      await pdfui.goToPage(snap.pageIndex)
    }
  } catch (e) {
    console.warn(LOG, 'goToPage failed', e)
  }
}

/** 仅视觉置灰；始终 enable，保证点击能进 handle / DOM 监听 */
function setVisualEnabled(comp: any, enabled: boolean) {
  try {
    comp?.enable?.()
    const el = (comp?.getElement?.() || comp?.element) as HTMLElement | undefined
    if (!el) return
    el.classList.toggle('litepdf-view-nav-disabled', !enabled)
    el.classList.toggle('disabled', !enabled)
    el.setAttribute('aria-disabled', enabled ? 'false' : 'true')
    el.removeAttribute?.('disabled')
  } catch {
    // ignore
  }
}

function getEl(comp: any): HTMLElement | null {
  try {
    return (comp?.getElement?.() || comp?.element || null) as HTMLElement | null
  } catch {
    return null
  }
}

export function createViewHistory(pdfui: any, UIExtension: any) {
  const stack: ViewSnapshot[] = []
  let cursor = -1
  let navigating = false
  let listening = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const buttons: ButtonHost = {}
  const clickBound = new WeakSet<HTMLElement>()

  function canBack() {
    return cursor > 0
  }

  function canForward() {
    return cursor >= 0 && cursor < stack.length - 1
  }

  function syncButtons() {
    setVisualEnabled(buttons.prev, canBack())
    setVisualEnabled(buttons.next, canForward())
  }

  function reset() {
    stack.length = 0
    cursor = -1
    syncButtons()
  }

  function push(snap: ViewSnapshot) {
    if (navigating) return
    const current = cursor >= 0 ? stack[cursor] : null
    if (current && sameSnapshot(current, snap)) {
      syncButtons()
      return
    }

    if (cursor < stack.length - 1) {
      stack.splice(cursor + 1)
    }
    stack.push(snap)
    if (stack.length > MAX_STACK) {
      const overflow = stack.length - MAX_STACK
      stack.splice(0, overflow)
      cursor = stack.length - 1
    } else {
      cursor = stack.length - 1
    }
    syncButtons()
  }

  function scheduleCapture(hint?: SnapshotHint) {
    if (navigating) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void captureNow(hint)
    }, 60)
  }

  async function captureNow(hint?: SnapshotHint) {
    if (navigating) return
    const snap = await readSnapshot(pdfui, hint)
    if (snap) push(snap)
    else syncButtons()
  }

  function listen(eventName: string, handler: (...args: any[]) => void) {
    if (!eventName) return
    try {
      // PDFUI API：string + function → 内部挂到 viewer.eventEmitter
      pdfui.addViewerEventListener?.(eventName, handler)
    } catch (e) {
      console.warn(LOG, 'addViewerEventListener failed', eventName, e)
    }
  }

  function ensureListening() {
    if (listening) return
    listening = true

    const Events = resolveViewerEvents(UIExtension)
    const openSuccess = Events.openFileSuccess || 'open-file-success'
    const renderSuccess = Events.renderFileSuccess || 'render-file-success'
    const pageChange = Events.pageNumberChange || 'page-number-change'
    const zoomSuccess = Events.zoomToSuccess || 'zoom-to-success'
    const viewModeSuccess = Events.changeViewModeSuccess || 'change-view-mode-success'
    const afterRotate = Events.afterDocumentRotation || 'after-document-rotation'

    listen(openSuccess, () => {
      reset()
    })

    listen(renderSuccess, () => {
      void captureNow()
    })

    // 文档约定：回调参数 newPageNumber = pageIndex + 1
    listen(pageChange, (newPageNumber: number) => {
      const pageIndex = Number(newPageNumber) - 1
      scheduleCapture(Number.isFinite(pageIndex) ? { pageIndex } : undefined)
    })

    listen(zoomSuccess, (newScale: number) => {
      const scale = Number(newScale)
      scheduleCapture(Number.isFinite(scale) && scale > 0 ? { scale } : undefined)
    })

    listen(viewModeSuccess, (NewViewModeClass: any, _Old?: any, newInstance?: any) => {
      // 回调：可通过 ViewModeClass.getName() 取得视图模式名
      const name =
        (typeof NewViewModeClass?.getName === 'function' && NewViewModeClass.getName()) ||
        (typeof newInstance?.getName === 'function' && newInstance.getName()) ||
        ''
      scheduleCapture(name ? { viewMode: String(name) } : undefined)
    })

    listen(afterRotate, (newRotationDegree: number) => {
      const rotation = Number(newRotationDegree)
      scheduleCapture(Number.isFinite(rotation) ? { rotation } : undefined)
    })

    syncButtons()
  }

  async function back() {
    if (!canBack()) return false
    navigating = true
    cursor -= 1
    syncButtons()
    try {
      await applySnapshot(pdfui, stack[cursor])
      return true
    } finally {
      setTimeout(() => {
        navigating = false
      }, 320)
    }
  }

  async function forward() {
    if (!canForward()) return false
    navigating = true
    cursor += 1
    syncButtons()
    try {
      await applySnapshot(pdfui, stack[cursor])
      return true
    } finally {
      setTimeout(() => {
        navigating = false
      }, 320)
    }
  }

  function bindClick(comp: any, which: 'prev' | 'next') {
    const el = getEl(comp)
    if (!el || clickBound.has(el)) return
    clickBound.add(el)
    el.addEventListener(
      'click',
      (e) => {
        // 视觉禁用时仍可能收到点击：直接忽略
        if (which === 'prev' && !canBack()) return
        if (which === 'next' && !canForward()) return
        e.preventDefault()
        e.stopPropagation()
        void (which === 'prev' ? back() : forward())
      },
      true,
    )
  }

  return {
    attachButton(which: 'prev' | 'next', comp: any) {
      if (!comp) return
      if (which === 'prev') buttons.prev = comp
      else buttons.next = comp
      bindClick(comp, which)
      syncButtons()
    },
    ensureListening,
    syncButtons,
    reset,
    captureNow,
    scheduleCapture,
    back,
    forward,
    canBack,
    canForward,
    /** 调试：当前栈深度 */
    debugState() {
      return { size: stack.length, cursor, canBack: canBack(), canForward: canForward() }
    },
  }
}

export type ViewHistory = ReturnType<typeof createViewHistory>

export function getViewHistory(pdfui: any, UIExtension: any): ViewHistory {
  if (!pdfui.__litepdfViewHistory) {
    pdfui.__litepdfViewHistory = createViewHistory(pdfui, UIExtension)
  }
  return pdfui.__litepdfViewHistory as ViewHistory
}

/**
 * 在 PDFUI 创建后立刻启动监听，并查找工具栏按钮做兜底绑定。
 * 不依赖 Controller.mounted，避免「事件从未挂上」。
 *
 * 注意：Foxit `getComponentByName` 在组件未渲染完成时可能一直 pending，
 * 必须加超时，否则会卡住 PdfTabHost 的「正在加载 PDF…」遮罩。
 */
export async function bindViewNavButtons(pdfui: any, UIExtension: any) {
  if (!pdfui) return
  const hist = getViewHistory(pdfui, UIExtension)
  hist.ensureListening()

  const getByName = async (name: string) => {
    try {
      if (!pdfui.getComponentByName) return null
      return await Promise.race([
        Promise.resolve(pdfui.getComponentByName(name)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])
    } catch {
      return null
    }
  }

  // 每次都尝试绑定按钮（幂等：click 用 WeakSet 防重复）
  for (let i = 0; i < 40; i++) {
    try {
      const prev = await getByName('litepdf-prev-view-btn')
      const next = await getByName('litepdf-next-view-btn')
      if (prev) hist.attachButton('prev', prev)
      if (next) hist.attachButton('next', next)
      if (prev && next) {
        hist.syncButtons()
        return
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 50))
  }
}
