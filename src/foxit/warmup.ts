import { getLicense } from './license'
import shellResetCssUrl from './styles/foxit-shell-reset.css?url'

declare global {
  interface Window {
    UIExtension?: any
    preloadJrWorker?: (options: Record<string, unknown>) => unknown
  }
}

export type FoxitWarmupBundle = {
  libPath: string
  fontPath: string
  UIExtension: any
  licenseSN: string
  licenseKey: string
  readyWorker: unknown
}

let sdkLoadPromise: Promise<any> | null = null
let warmupPromise: Promise<FoxitWarmupBundle> | null = null

export async function resolveLibPath() {
  if (window.litepdf?.getFoxitLibUrl) {
    return (await window.litepdf.getFoxitLibUrl()).replace(/\/$/, '')
  }
  return `${window.location.origin}/foxit-lib`
}

/** 与官方 Vue3 示例一致；未嵌入字体再靠 Local Font Access 走本机字体 */
export function resolveFontPath() {
  return 'https://webpdf.foxitsoftware.com/webfonts/'
}

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

function ensureShellResetCss() {
  const id = 'litepdf-foxit-shell-reset'
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = shellResetCssUrl
  }
  document.head.appendChild(link)
}

/** 浏览器/HTTP 缓存预取；失败忽略，不阻塞首屏 */
function prefetchUrls(urls: string[]) {
  for (const url of urls) {
    try {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'script'
      link.href = url
      document.head.appendChild(link)
    } catch {
      // ignore
    }
    void fetch(url, { cache: 'force-cache', mode: 'cors' }).catch(() => undefined)
  }
}

export async function ensureUIExtension(libPath: string) {
  ensureCss(`${libPath}/UIExtension.css`)
  ensureShellResetCss()

  if (window.UIExtension?.PDFUI) return window.UIExtension
  if (!sdkLoadPromise) {
    sdkLoadPromise = (async () => {
      await loadScript(`${libPath}/preload-jr-worker.js`)
      await loadScript(`${libPath}/UIExtension.full.js`)
      if (!window.UIExtension) throw new Error('UIExtension 未能加载')
      return window.UIExtension
    })().catch((error) => {
      sdkLoadPromise = null
      throw error
    })
  }
  return sdkLoadPromise
}

/**
 * 开始页/应用启动时后台预热：拉齐 SDK 脚本、License、JR Worker，并预取引擎资源。
 * mount 时复用同一 Promise，避免首开文档冷启动过久。
 */
export function warmupFoxitSdk() {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      const libPath = await resolveLibPath()
      const fontPath = resolveFontPath()

      prefetchUrls([
        `${libPath}/WebPDFJRWorker.js`,
        `${libPath}/jr-engine/gsdk/gsdk.js`,
        `${libPath}/MessageWorker.js`,
      ])

      const [UIExtension, license] = await Promise.all([
        ensureUIExtension(libPath),
        getLicense(),
      ])

      if (typeof window.preloadJrWorker !== 'function') {
        throw new Error('preloadJrWorker 未就绪')
      }

      const readyWorker = window.preloadJrWorker({
        workerPath: `${libPath}/`,
        enginePath: `${libPath}/jr-engine/gsdk`,
        fontPath,
        licenseSN: license.licenseSN,
        licenseKey: license.licenseKey,
      })

      return {
        libPath,
        fontPath,
        UIExtension,
        licenseSN: license.licenseSN,
        licenseKey: license.licenseKey,
        readyWorker,
      }
    })().catch((error) => {
      warmupPromise = null
      throw error
    })
  }
  return warmupPromise
}
