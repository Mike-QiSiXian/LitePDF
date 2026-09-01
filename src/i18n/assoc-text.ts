import { t } from '@/i18n'

/** 根据状态字段生成界面文案，避免直接展示主进程返回的中文 message */
export function describePdfAssociation(status: {
  packaged: boolean
  registered: boolean
  isDefault: boolean
  platform: string
}): string {
  if (status.platform === 'browser') return t('assoc.browser')
  // 开发态也要先反映「是否已是默认」，不能被开发提示盖掉
  if (status.isDefault) return t('assoc.isDefault')
  if (!status.packaged) return t('assoc.devMode')
  if (status.platform === 'win32') {
    return status.registered ? t('assoc.winRegistered') : t('assoc.winNotRegistered')
  }
  if (status.platform === 'darwin') return t('assoc.macReady')
  return t('assoc.unsupported')
}

export function describeSetDefaultResult(result: {
  ok: boolean
  isDefault: boolean
  openedSystemSettings?: boolean
  message?: string
  platform?: string
}): string {
  const platform =
    result.platform ||
    (typeof window !== 'undefined' ? String(window.litepdf?.platform || '') : '')

  if (result.isDefault) {
    return platform === 'darwin' ? t('assoc.macSetOk') : t('assoc.isDefault')
  }
  if (!result.ok) {
    if (result.message && /install|安装/i.test(result.message)) return t('assoc.needInstall')
    if (platform === 'darwin') return t('assoc.macManual')
    return result.message || t('assoc.registerFailed')
  }
  if (platform === 'darwin') return t('assoc.macSetFailed')
  if (result.openedSystemSettings) return t('assoc.winOpenedSettings')
  if (platform === 'win32') return t('assoc.winRegisteredNeedSettings')
  return t('assoc.unsupported')
}
