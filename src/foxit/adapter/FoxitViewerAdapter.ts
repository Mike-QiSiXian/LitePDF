import { createLiteAppearance } from '../appearance/LiteAppearance'
import { registerLiteControllers } from '../controllers/registerLiteControllers'
import { bindToolbarTabs } from '../controllers/ToolbarTabBinder'
import {
  bindViewNavButtons,
  captureViewSnapshot,
  restoreViewSnapshot,
  type ViewSnapshot,
} from '../controllers/ViewHistory'
import { bindUndoRedoButtons } from '../controllers/UndoRedoBinder'
import { isRawEngineErrorCode, toUserFacingErrorMessage } from '../errors'
import { takeReadyWorkerForInstance, warmupFoxitSdk } from '../warmup'
import '../styles/viewer-chrome.css'
import type { AdapterCallbacks, FoxitViewerAdapter } from './types'

declare global {
  interface Window {
    UIExtension?: any
    preloadJrWorker?: (options: Record<string, unknown>) => unknown
  }
}

const PDFUI_INIT_TIMEOUT_MS = 60000

function toFileName(filePath: string) {
  return filePath.split(/[/\\]/).pop() || 'document.pdf'
}

function resolveViewerEvents(UIExtension: any) {
  return (
    UIExtension?.PDFViewCtrl?.constants?.ViewerEvents ||
    UIExtension?.PDFViewCtrl?.ViewerEvents ||
    {}
  )
}

function isBlankErrorMessage(message: unknown) {
  const text = String(message ?? '').trim()
  return !text || text === 'null' || text === 'undefined'
}

function normalizeOpenError(value: unknown) {
  const friendly = toUserFacingErrorMessage(value)
  if (friendly) {
    const error = value instanceof Error ? value : new Error(friendly)
    error.message = friendly
    if (value && typeof value === 'object' && value !== error) Object.assign(error, value)
    return error
  }

  if (
    isRawEngineErrorCode(value) ||
    (value instanceof Error && isRawEngineErrorCode(value.message)) ||
    (value && typeof value === 'object' && isRawEngineErrorCode((value as Record<string, unknown>).message))
  ) {
    const error = new Error('')
    if (value && typeof value === 'object') Object.assign(error, value)
    return error
  }

  if (value instanceof Error) {
    if (!isBlankErrorMessage(value.message)) return value
    return new Error('PDF 引擎未能打开文件，请重试。')
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const raw = source.message ?? source.error
    const message = isBlankErrorMessage(raw) ? 'PDF 引擎未能打开文件，请重试。' : String(raw)
    const error = new Error(isRawEngineErrorCode(message) ? '' : message)
    Object.assign(error, source)
    return error
  }
  if (value == null || isBlankErrorMessage(value)) {
    return new Error('PDF 引擎未能打开文件，请重试。')
  }
  return new Error(String(value))
}

/** 优先走 SDK 官方 waitForInitialization；事件名 SDK 内为 pdfui-intialization-completed */
async function waitForPdfuiReady(pdfui: any, UIExtension: any) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('PDFUI 初始化超时')), PDFUI_INIT_TIMEOUT_MS)
  })

  const init =
    typeof pdfui.waitForInitialization === 'function'
      ? pdfui.waitForInitialization()
      : new Promise<void>((resolve, reject) => {
          const eventName =
            UIExtension?.UIEvents?.initializationCompleted || 'pdfui-intialization-completed'
          try {
            pdfui.addUIEventListener(eventName, () => resolve())
          } catch (error) {
            reject(normalizeOpenError(error))
          }
        })

  await Promise.race([init, timeout])

  try {
    await pdfui.grantQueryLocalFontsPermission?.('granted')
  } catch {
    // 非 Electron / 不支持 Local Font Access 时忽略
  }
}

/**
 * 在 WebSDK 的 open-file-success / open-file-failed 回调里结束打开流程。
 * 官方示例用这两个事件开关 loading，不要等 openPDFByFile 整段（可能拖到首屏渲染）。
 */
function waitForOpenFileEvent(
  pdfui: any,
  UIExtension: any,
  startOpen: () => Promise<unknown>,
) {
  const Events = resolveViewerEvents(UIExtension)
  const successName = Events.openFileSuccess || 'open-file-success'
  const failedName = Events.openFileFailed || 'open-file-failed'

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      finish(() => reject(new Error('打开 PDF 超时，请检查文件是否损坏。')))
    }, 30000)
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        pdfui.removeViewerEventListener?.(successName, onSuccess)
        pdfui.removeViewerEventListener?.(failedName, onFailed)
      } catch {
        // ignore
      }
      action()
    }
    const onSuccess = () => finish(() => resolve())
    const onFailed = (err?: unknown) =>
      finish(() => {
        reject(normalizeOpenError(err))
      })

    pdfui.addViewerEventListener(successName, onSuccess)
    pdfui.addViewerEventListener(failedName, onFailed)
    // 先挂监听再打开；成功以 ViewerEvent 为准，启动阶段异常则立即失败
    Promise.resolve()
      .then(startOpen)
      .catch(onFailed)
  })
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function getComponentByNameSafe(pdfui: any, name: string, timeoutMs = 800) {
  if (!pdfui?.getComponentByName) return null
  try {
    // Foxit getComponentByName 在组件未就绪时可能一直 pending，必须加超时
    return await withTimeout(Promise.resolve(pdfui.getComponentByName(name)), timeoutMs, null)
  } catch {
    return null
  }
}

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null
  mozFullScreenElement?: Element | null
  msFullscreenElement?: Element | null
}

/** 播放模式 UI 隐藏：以浏览器原生全屏为准，避免 Foxit 用窗口尺寸误判 */
function isNativeFullscreen() {
  const doc = document as FullscreenDoc
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  )
}

function syncPresentationChrome() {
  document.body.classList.toggle('fv__pdfui-fullscreen-mode', isNativeFullscreen())
}

function bindPresentationFullscreenSync(pdfui: any) {
  const onChange = () => syncPresentationChrome()

  pdfui.addUIEventListener('fullscreenchange', onChange)
  document.addEventListener('fullscreenchange', onChange)
  document.addEventListener('webkitfullscreenchange', onChange)
  document.addEventListener('mozfullscreenchange', onChange)
  syncPresentationChrome()

  return () => {
    document.removeEventListener('fullscreenchange', onChange)
    document.removeEventListener('webkitfullscreenchange', onChange)
    document.removeEventListener('mozfullscreenchange', onChange)
    document.body.classList.remove('fv__pdfui-fullscreen-mode')
  }
}

async function setFilenameLabel(pdfui: any, name: string) {
  try {
    const comp = await getComponentByNameSafe(pdfui, 'litepdf-filename', 500)
    const el =
      comp?.getElement?.() ||
      comp?.element ||
      document.querySelector('.litepdf-pdfui [name="litepdf-filename"]')
    if (el) {
      el.textContent = name
      el.setAttribute('title', name)
    }
  } catch {
    // ignore
  }
}

export function createFoxitViewerAdapter(callbacks: AdapterCallbacks = {}): FoxitViewerAdapter {
  let pdfui: any = null
  let hostEl: HTMLElement | null = null
  let currentPath = ''
  let destroyed = false
  let mountPromise: Promise<void> | null = null

  return {
    async mount(host: HTMLElement) {
      if (destroyed) throw new Error('Adapter 已销毁')
      if (pdfui) return
      if (!mountPromise) {
        mountPromise = (async () => {
          hostEl = host
          host.innerHTML = ''
          const renderTo = document.createElement('div')
          renderTo.className = 'litepdf-pdfui'
          renderTo.style.width = '100%'
          renderTo.style.height = '100%'
          host.appendChild(renderTo)

          const base = await warmupFoxitSdk()
          const { libPath, UIExtension } = base
          const readyWorker = takeReadyWorkerForInstance(base)

          // 须在 new PDFUI 之前注册自研 Controller
          registerLiteControllers(UIExtension)
          const LiteAppearance = createLiteAppearance(UIExtension)

          const addons = [
            `${libPath}/uix-addons/thumbnail`,
            `${libPath}/uix-addons/search`,
            `${libPath}/uix-addons/print`,
            `${libPath}/uix-addons/undo-redo`,
            `${libPath}/uix-addons/file-property`,
            `${libPath}/uix-addons/full-screen`,
          ]

          pdfui = new UIExtension.PDFUI({
            viewerOptions: {
              libPath,
              jr: {
                readyWorker,
              },
            },
            renderTo,
            appearance: LiteAppearance,
            fragments: [],
            addons,
          })
          pdfui.__litepdfUIExtension = UIExtension
          pdfui.__litepdfFullscreenCleanup = bindPresentationFullscreenSync(pdfui)

          await waitForPdfuiReady(pdfui, UIExtension)

          // 文件名与导航绑定不阻塞 mount，避免拖住后续 openFile
          void setFilenameLabel(pdfui, '未打开文件')
          void bindToolbarTabs(pdfui)
          void bindViewNavButtons(pdfui, UIExtension)
          void bindUndoRedoButtons(pdfui)
        })()
      }
      try {
        await mountPromise
      } catch (e) {
        mountPromise = null
        pdfui = null
        throw e
      }
    },

    async openFile(filePath: string, password = '') {
      if (mountPromise) await mountPromise
      if (!pdfui) throw new Error('请先 mount')
      currentPath = filePath
      const bytes = await window.litepdf.readFile(filePath)
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const fileName = toFileName(filePath)
      const file = new File([copy], fileName, { type: 'application/pdf' })

      try {
        try {
          pdfui.__litepdfViewHistory?.reset?.()
          pdfui.__litepdfUndoRedo?.reset?.()
        } catch {
          // ignore
        }
        const UIX = pdfui.__litepdfUIExtension || window.UIExtension
        // 遮罩应在 openFileSuccess 回调里关闭，而不是等 openPDFByFile / 首屏渲染
        await waitForOpenFileEvent(pdfui, UIX, () =>
          pdfui.openPDFByFile(file, { password, fileName }),
        )
        pdfui.__litepdfFilePath = filePath
        void setFilenameLabel(pdfui, fileName)
        void bindViewNavButtons(pdfui, UIX).then(() => {
          try {
            void pdfui.__litepdfViewHistory?.captureNow?.()
          } catch {
            // ignore
          }
        })
        void bindUndoRedoButtons(pdfui)
        callbacks.onDirtyChange?.(false)
      } catch (err: any) {
        const msg = String(err?.message || err || '')
        const needPassword =
          /password/i.test(msg) || err?.error === 3 || err?.code === 3 || err?.ret === 3
        if (needPassword && callbacks.onPasswordRequired) {
          const input = await callbacks.onPasswordRequired()
          if (!input) throw err
          await this.openFile(filePath, input)
          return
        }
        callbacks.onError?.(err)
        throw err
      }
    },

    async saveTo(filePath: string) {
      if (mountPromise) await mountPromise
      if (!pdfui) throw new Error('请先 mount')
      let doc = await pdfui.getCurrentPDFDoc?.()
      if (!doc) {
        const viewer = await pdfui.getPDFViewer?.()
        doc = viewer?.getCurrentPDFDoc?.()
      }
      if (!doc) throw new Error('当前没有打开的文档')

      const fileName = toFileName(filePath)
      const file: File = await doc.getFile(
        { flags: 0, fileName },
        {
          progressHandler: {
            onProgress: () => undefined,
            isCanceled: () => false,
          },
        },
      )
      const buffer = await file.arrayBuffer()
      await window.litepdf.writeFile(filePath, new Uint8Array(buffer))
      currentPath = filePath
      await setFilenameLabel(pdfui, fileName)
      callbacks.onDirtyChange?.(false)
    },

    getFileName() {
      return toFileName(currentPath)
    },

    async captureViewState() {
      if (!pdfui) return null
      return captureViewSnapshot(pdfui)
    },

    async restoreViewState(snapshot: ViewSnapshot) {
      if (!pdfui) return
      await restoreViewSnapshot(pdfui, snapshot)
    },

    async destroy() {
      destroyed = true
      try {
        if (pdfui) {
          pdfui.__litepdfFullscreenCleanup?.()
          await pdfui.close?.()
          pdfui.destroy?.()
        }
      } catch {
        // ignore
      }
      pdfui = null
      mountPromise = null
      if (hostEl) {
        hostEl.innerHTML = ''
        hostEl = null
      }
    },
  }
}
