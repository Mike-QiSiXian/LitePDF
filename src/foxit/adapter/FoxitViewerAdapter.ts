import { createLiteAppearance } from '../appearance/LiteAppearance'
import { registerLiteControllers } from '../controllers/registerLiteControllers'
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

async function setFilenameLabel(pdfui: any, name: string) {
  try {
    const comp = await pdfui.getComponentByName?.('litepdf-filename')
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

  return {
    async mount(host: HTMLElement) {
      if (destroyed) throw new Error('Adapter 已销毁')
      hostEl = host
      host.innerHTML = ''
      const renderTo = document.createElement('div')
      renderTo.className = 'litepdf-pdfui'
      renderTo.style.width = '100%'
      renderTo.style.height = '100%'
      host.appendChild(renderTo)

      const libPath = await resolveLibPath()
      const UIExtension = await ensureUIExtension(libPath)
      const { licenseSN, licenseKey } = await getLicense()

      const readyWorker = window.preloadJrWorker?.({
        workerPath: `${libPath}/`,
        enginePath: `${libPath}/jr-engine/gsdk`,
        fontPath: import.meta.env.DEV
          ? `${window.location.origin}/foxit-external/brotli`
          : `${libPath}/`,
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
      ]

      pdfui = new UIExtension.PDFUI({
        viewerOptions: {
          libPath,
          jr: {
            readyWorker,
            licenseSN,
            licenseKey,
          },
        },
        renderTo,
        appearance: LiteAppearance,
        fragments: [],
        addons,
      })

      await setFilenameLabel(pdfui, '未打开文件')
    },

    async openFile(filePath: string, password = '') {
      if (!pdfui) throw new Error('请先 mount')
      currentPath = filePath
      const bytes = await window.litepdf.readFile(filePath)
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const fileName = toFileName(filePath)
      const file = new File([copy], fileName, { type: 'application/pdf' })

      try {
        await pdfui.openPDFByFile(file, { password, fileName })
        pdfui.__litepdfFilePath = filePath
        await setFilenameLabel(pdfui, fileName)
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
          await pdfui.close?.()
          pdfui.destroy?.()
        }
      } catch {
        // ignore
      }
      pdfui = null
      if (hostEl) {
        hostEl.innerHTML = ''
        hostEl = null
      }
    },
  }
}
