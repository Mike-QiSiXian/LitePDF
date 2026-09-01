import fs from 'node:fs'
import { getUserDataFile } from '../paths'

export type UiLanguage = 'zh-CN' | 'en-US'

const SETTINGS_FILE = 'ui-settings.json'

function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'zh-CN' || value === 'en-US'
}

export async function getUiLanguage(): Promise<UiLanguage | null> {
  try {
    const raw = await fs.promises.readFile(getUserDataFile(SETTINGS_FILE), 'utf8')
    const settings = JSON.parse(raw) as { language?: unknown }
    return isUiLanguage(settings.language) ? settings.language : null
  } catch {
    return null
  }
}

export async function setUiLanguage(language: unknown): Promise<void> {
  if (!isUiLanguage(language)) throw new Error('不支持的界面语言')
  const filePath = getUserDataFile(SETTINGS_FILE)
  await fs.promises.mkdir(getUserDataFile(''), { recursive: true })
  await fs.promises.writeFile(
    filePath,
    JSON.stringify({ language }, null, 2),
    'utf8',
  )
}
