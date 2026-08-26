import { getLicense } from './license'
import shellResetCssUrl from './styles/foxit-shell-reset.css?url'

declare global {
  interface Window {
    UIExtension?: any
    preloadJrWorker?: (options: Record<string, unknown>) => unknown
  }
}

export type FoxitScriptsBundle = {
  libPath: string
  /** JR Worker 路径；安装版与 libPath 同为 127.0.0.1 静态服务 */
  workerLibPath: string
  fontPath: string
  UIExtension: any
  licenseSN: string
  licenseKey: string
}

/** @deprecated 使用 FoxitScriptsBundle + createReadyWorker */
export type FoxitWarmupBundle = FoxitScriptsBundle & {
  readyWorker: unknown
}

let sdkLoadPromise: Promise<any> | null = null
let scriptsWarmupPromise: Promise<FoxitScriptsBundle> | null = null
/** 欢迎页后台预热的 Worker，仅供首个 PDFUI 实例认领，不可多实例共用 */
let prewarmedWorker: unknown | null = null
let prewarmTask: Promise<unknown> | null = null

export async function resolveLibPath() {
  if (window.litepdf?.getFoxitLibUrl) {
    return (await window.litepdf.getFoxitLibUrl()).replace(/\/$/, '')
  }
  return `${window.location.origin}/foxit-lib`
}

export async function resolveWorkerLibPath() {
  if (window.litepdf?.getFoxitWorkerLibUrl) {
    return (await window.litepdf.getFoxitWorkerLibUrl()).replace(/\/$/, '')
  }
  return resolveLibPath()
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

function ensureScriptsWarmup() {
  if (!scriptsWarmupPromise) {
    scriptsWarmupPromise = (async () => {
      const [libPath, workerLibPath] = await Promise.all([
        resolveLibPath(),
        resolveWorkerLibPath(),
      ])
      const fontPath = resolveFontPath()

      prefetchUrls([
        `${workerLibPath}/WebPDFJRWorker.js`,
        `${workerLibPath}/jr-engine/gsdk/gsdk.js`,
        `${workerLibPath}/MessageWorker.js`,
      ])

      const [UIExtension, license] = await Promise.all([
        ensureUIExtension(libPath),
        getLicense(),
      ])

      return {
        libPath,
        workerLibPath,
        fontPath,
        UIExtension,
        licenseSN: license.licenseSN,
        licenseKey: license.licenseKey,
      }
    })().catch((error) => {
      scriptsWarmupPromise = null
      throw error
    })
  }
  return scriptsWarmupPromise
}

/**
 * 为单个 PDFUI 实例创建独立 JR Worker。
 * WebSDK 多实例场景下 readyWorker 不可共用，每实例须单独构造。
 */
export function createReadyWorker(base: FoxitScriptsBundle): unknown {
  if (typeof window.preloadJrWorker !== 'function') {
    throw new Error('preloadJrWorker 未就绪')
  }

  const workerBase = base.workerLibPath || base.libPath
  return window.preloadJrWorker({
    workerPath: `${workerBase}/`,
    enginePath: `${workerBase}/jr-engine/gsdk`,
    fontPath: base.fontPath,
    licenseSN: base.licenseSN,
    licenseKey: base.licenseKey,
  })
}

/**
 * 欢迎页后台预创建 Worker，缩短首个 PDF 打开等待。
 * 仅首个 PDFUI 可认领；后续实例须调用 createReadyWorker。
 */
export function prewarmJrWorkerInBackground(): Promise<unknown | void> {
  if (prewarmedWorker) return Promise.resolve(prewarmedWorker)
  if (!prewarmTask) {
    prewarmTask = ensureScriptsWarmup()
      .then((base) => {
        const worker = createReadyWorker(base)
        prewarmedWorker = worker
        return worker
      })
      .catch((error) => {
        prewarmTask = null
        throw error
      })
  }
  return prewarmTask
}

/** 认领欢迎页预热的 Worker；若无则即时新建（每 PDFUI 实例各一份） */
export function takeReadyWorkerForInstance(base: FoxitScriptsBundle): unknown {
  if (prewarmedWorker) {
    const worker = prewarmedWorker
    prewarmedWorker = null
    prewarmTask = null
    return worker
  }
  return createReadyWorker(base)
}

/**
 * 预热 Foxit SDK 脚本与 License（全局可共享）。
 * JR Worker 请对每个 PDFUI 实例单独 create / take。
 */
export async function warmupFoxitSdk(): Promise<FoxitScriptsBundle> {
  return ensureScriptsWarmup()
}
