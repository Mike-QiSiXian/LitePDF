import { createLiteAppearance } from '../appearance/LiteAppearance'
import { registerLiteControllers } from '../controllers/registerLiteControllers'
import { bindToolbarTabs } from '../controllers/ToolbarTabBinder'
import { bindViewNavButtons } from '../controllers/ViewHistory'
import { bindUndoRedoButtons } from '../controllers/UndoRedoBinder'
import { getLicense } from '../license'
import shellResetCssUrl from '../styles/foxit-shell-reset.css?url'
import '../styles/viewer-chrome.css'
import type { AdapterCallbacks, FoxitViewerAdapter } from './types'

declare global {
  interface Window {
    UIExtension?: any
    preloadJrWorker?: (options: Record<string, unknown>) => unknown
  }
}

async function resolveLibPath() {
  if (window.litepdf?.getFoxitLibUrl) {
    return (await window.litepdf.getFoxitLibUrl()).replace(/\/$/, '')
  }
  return `${window.location.origin}/foxit-lib`
}

async function resolveFontPath() {
  if (window.litepdf?.getFoxitExternalUrl) {
    return `${(await window.litepdf.getFoxitExternalUrl()).replace(/\/$/, '')}/brotli`
  }
  return `${window.location.origin}/foxit-external/brotli`
}

let sdkLoadPromise: Promise<any> | null = null

async function loadScript(src: string) {
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`加载脚本失败: ${src}`))
    document.head.appendChild(script)
  })
}

function ensureCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

/** 在 Foxit 全局样式之后强制恢复应用壳全宽，避免整窗被挤成窄条 */
function ensureShellResetCss() {
  const id = 'litepdf-foxit-shell-reset'
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = shellResetCssUrl
  }
  // 始终挪到 head 末尾，保证压过 UIExtension.css
  document.head.appendChild(link)
}

async function ensureUIExtension(libPath: string) {
  // 每次都确保 reset 在 Foxit CSS 之后（HMR / 二次 mount 也要覆盖）
  ensureCss(`${libPath}/UIExtension.css`)
  ensureShellResetCss()

  if (window.UIExtension?.PDFUI) return window.UIExtension
  if (!sdkLoadPromise) {
    sdkLoadPromise = (async () => {
      await loadScript(`${libPath}/preload-jr-worker.js`)
      await loadScript(`${libPath}/UIExtension.full.js`)
      if (!window.UIExtension) throw new Error('UIExtension 未能加载')
      return window.UIExtension
    })()
  }
  return sdkLoadPromise
}

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
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
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
        reject(err instanceof Error ? err : new Error(String(err || '打开文件失败')))
      })

    pdfui.addViewerEventListener(successName, onSuccess)
    pdfui.addViewerEventListener(failedName, onFailed)
    // 先挂监听再打开，避免错过同步派发的 success；promise 仅作兜底
    Promise.resolve()
      .then(startOpen)
      .then(onSuccess, onFailed)
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

          const libPath = await resolveLibPath()
          const fontPath = await resolveFontPath()
          const UIExtension = await ensureUIExtension(libPath)
          const { licenseSN, licenseKey } = await getLicense()

          const readyWorker = window.preloadJrWorker?.({
            workerPath: `${libPath}/`,
            enginePath: `${libPath}/jr-engine/gsdk`,
            fontPath,
            licenseSN,
            licenseKey,
          })

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
                fontPath,
                licenseSN,
                licenseKey,
              },
            },
            renderTo,
            appearance: LiteAppearance,
            fragments: [],
            addons,
          })
          pdfui.__litepdfUIExtension = UIExtension
          pdfui.__litepdfFullscreenCleanup = bindPresentationFullscreenSync(pdfui)

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
