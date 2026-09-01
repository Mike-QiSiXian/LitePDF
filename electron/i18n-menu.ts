import { getUserDataFile } from './paths'

/** 主进程菜单/对话框用的轻量词条（与渲染进程 src/i18n/messages 保持同步） */
export type UiLanguage = 'zh-CN' | 'en-US'

const menuMessages: Record<UiLanguage, Record<string, string>> = {
  'zh-CN': {
    file: '文件',
    open: '打开…',
    save: '保存…',
    setDefaultPdf: '设为默认 PDF 阅读器…',
    quit: '退出',
    view: '视图',
    reload: '重新加载',
    toggleDevTools: '开发者工具',
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '全屏',
    openPdfTitle: '打开 PDF',
    saveAsTitle: '另存为',
  },
  'en-US': {
    file: 'File',
    open: 'Open…',
    save: 'Save…',
    setDefaultPdf: 'Set as default PDF reader…',
    quit: 'Quit',
    view: 'View',
    reload: 'Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Full Screen',
    openPdfTitle: 'Open PDF',
    saveAsTitle: 'Save As',
  },
}

let currentLanguage: UiLanguage = 'zh-CN'

export function getCurrentMenuLanguage() {
  return currentLanguage
}

export async function resolveStartupLanguage(): Promise<UiLanguage> {
  try {
    const fs = await import('node:fs/promises')
    const raw = await fs.readFile(getUserDataFile('ui-settings.json'), 'utf8')
    const settings = JSON.parse(raw) as { language?: unknown }
    if (settings.language === 'zh-CN' || settings.language === 'en-US') {
      currentLanguage = settings.language
      return currentLanguage
    }
  } catch {
    // ignore
  }
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
  currentLanguage = locale.startsWith('zh') ? 'zh-CN' : 'en-US'
  return currentLanguage
}

export function setCurrentMenuLanguage(language: UiLanguage) {
  currentLanguage = language
}

export function mt(key: string) {
  return menuMessages[currentLanguage][key] || menuMessages['zh-CN'][key] || key
}
