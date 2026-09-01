export type LitePdfUiLanguage = 'zh-CN' | 'en-US'

const STORAGE_KEY = 'litepdf.ui-language'
const NAMESPACE = 'litepdf'
const activePdfUis = new Set<any>()
let preferredLanguagePromise: Promise<LitePdfUiLanguage> | null = null

const resources = {
  'zh-CN': {
    sidebar: {
      navigation: '缩略图/书签/注释列表',
    },
    file: {
      noDocument: '未打开文件',
    },
    toolbar: {
      textHighlight: '文本高亮',
      pencil: '画笔工具',
      eraser: '局部擦除',
    },
    moreMenu: {
      annotations: '注解',
      presentation: '播放',
      properties: '文档属性',
    },
  },
  'en-US': {
    sidebar: {
      navigation: 'Thumbnails/Bookmarks/Comments',
    },
    file: {
      noDocument: 'No document open',
    },
    toolbar: {
      textHighlight: 'Text Highlight',
      pencil: 'Pencil Tool',
      eraser: 'Partial Eraser',
    },
    moreMenu: {
      annotations: 'Annotations',
      presentation: 'Presentation',
      properties: 'Document Properties',
    },
  },
} as const

function noDocumentLabel(language: LitePdfUiLanguage) {
  return resources[language].file.noDocument
}

export function getPreferredUiLanguage(): Promise<LitePdfUiLanguage> {
  if (!preferredLanguagePromise) {
    preferredLanguagePromise = (async () => {
      try {
        const saved = await window.litepdf?.getUiLanguage?.()
        if (saved === 'zh-CN' || saved === 'en-US') return saved
      } catch {
        // Electron 设置读取失败时回退到浏览器存储
      }
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'zh-CN' || saved === 'en-US') return saved
      } catch {
        // localStorage 不可用时跟随浏览器语言
      }
      return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
    })()
  }
  return preferredLanguagePromise
}

/** 写入顶栏文件名；有打开文档时存真实文件名，切语言后据此还原 */
export async function setLitePdfFilenameLabel(pdfui: any, name: string | null | undefined) {
  const language = await getPreferredUiLanguage()
  const display = (name && String(name).trim()) || noDocumentLabel(language)
  if (name && String(name).trim()) {
    pdfui.__litepdfDisplayName = String(name).trim()
  } else {
    pdfui.__litepdfDisplayName = ''
  }

  try {
    const root = await pdfui?.getRootComponent?.()
    const comp = root?.getComponentByName?.('litepdf-filename')
    const el =
      comp?.getElement?.() ||
      comp?.element ||
      pdfui?.getPDFUIElement?.()?.querySelector?.('[name="litepdf-filename"]') ||
      document.querySelector('.litepdf-pdfui [name="litepdf-filename"]')
    if (el) {
      el.textContent = display
      el.setAttribute('title', display)
      el.removeAttribute('data-i18n')
    }
  } catch {
    // 组件未就绪时忽略
  }
}

async function restoreFilenameAfterLocalize(pdfui: any, language: LitePdfUiLanguage) {
  const stored = typeof pdfui?.__litepdfDisplayName === 'string' ? pdfui.__litepdfDisplayName : ''
  const display = stored || noDocumentLabel(language)
  try {
    const root = await pdfui?.getRootComponent?.()
    const comp = root?.getComponentByName?.('litepdf-filename')
    const el =
      comp?.getElement?.() ||
      comp?.element ||
      document.querySelector('.litepdf-pdfui [name="litepdf-filename"]')
    if (el) {
      el.textContent = display
      el.setAttribute('title', display)
      el.removeAttribute('data-i18n')
    }
  } catch {
    // ignore
  }
}

export function registerLitePdfI18n(pdfui: any) {
  for (const language of ['zh-CN', 'en-US'] as const) {
    pdfui?.i18n?.addResourceBundle?.(language, NAMESPACE, resources[language], true, true)
  }
  activePdfUis.add(pdfui)
}

export async function localizeLitePdfUi(pdfui: any) {
  try {
    const root = await pdfui?.getRootComponent?.()
    root?.localize?.()
  } catch {
    // 组件销毁或尚未挂载时忽略
  }
}

export function unregisterLitePdfI18n(pdfui: any) {
  activePdfUis.delete(pdfui)
}

export async function changeLitePdfUiLanguage(language: LitePdfUiLanguage) {
  preferredLanguagePromise = Promise.resolve(language)
  try {
    await window.litepdf?.setUiLanguage?.(language)
  } catch {
    // Electron 设置写入失败时仍保留当前会话和浏览器存储
  }
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // localStorage 不可用时仍切换当前会话
  }

  await Promise.all(
    [...activePdfUis].map(async (pdfui) => {
      try {
        await pdfui?.changeLanguage?.(language)
        await localizeLitePdfUi(pdfui)
        // localize 可能异步重刷文案；立刻还原，并在下一帧再补一次
        await restoreFilenameAfterLocalize(pdfui, language)
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            void restoreFilenameAfterLocalize(pdfui, language).finally(() => resolve())
          })
        })
      } catch {
        // 单个已销毁实例不影响其它标签
      }
    }),
  )
}
