import { computed, ref } from 'vue'
import {
  changeLitePdfUiLanguage,
  getPreferredUiLanguage,
  type LitePdfUiLanguage,
} from '@/foxit/i18n'
import { messages, type UiLanguage } from './messages'

export type { LitePdfUiLanguage }

export type { UiLanguage }

const language = ref<UiLanguage>('zh-CN')
let readyPromise: Promise<void> | null = null

function lookup(tree: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = tree
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] == null ? `{${key}}` : String(params[key]),
  )
}

export function t(key: string, params?: Record<string, string | number>) {
  const text =
    lookup(messages[language.value], key) ||
    lookup(messages['zh-CN'], key) ||
    key
  return interpolate(text, params)
}

export function useI18n() {
  return {
    language: computed(() => language.value),
    t,
    changeLanguage,
  }
}

export function getUiLanguage() {
  return language.value
}

export async function initI18n() {
  if (!readyPromise) {
    readyPromise = (async () => {
      language.value = await getPreferredUiLanguage()
      document.documentElement.lang = language.value
    })()
  }
  await readyPromise
}

export async function changeLanguage(next: UiLanguage) {
  language.value = next
  document.documentElement.lang = next
  await changeLitePdfUiLanguage(next as LitePdfUiLanguage)
}

export { messages }
