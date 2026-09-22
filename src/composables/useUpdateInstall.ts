import { onBeforeUnmount, onMounted, ref } from 'vue'
import { showAppAlert } from '@/composables/useAppAlert'
import { t } from '@/i18n'

export function useUpdateInstall() {
  const busy = ref(false)
  const percent = ref(0)
  const transferred = ref(0)
  const phase = ref<'idle' | 'downloading' | 'installing'>('idle')
  let offProgress: (() => void) | undefined

  onMounted(() => {
    offProgress = window.litepdf.onUpdateProgress?.((progress) => {
      phase.value = progress.phase
      percent.value = progress.percent
      transferred.value = progress.transferred
    })
  })

  onBeforeUnmount(() => {
    offProgress?.()
  })

  async function installUpdate(downloadUrl?: string) {
    if (!downloadUrl || busy.value) return
    busy.value = true
    phase.value = 'downloading'
    percent.value = 0
    transferred.value = 0
    try {
      await window.litepdf.downloadUpdate(downloadUrl)
    } catch (error) {
      busy.value = false
      phase.value = 'idle'
      showAppAlert({
        title: t('update.failed'),
        message: error instanceof Error ? error.message : t('update.failed'),
        tone: 'error',
      })
    }
  }

  function formatSize(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
    return `${bytes} B`
  }

  function actionLabel() {
    if (phase.value === 'installing') return t('update.installing')
    if (phase.value === 'downloading') {
      if (percent.value > 0) return t('update.downloading', { percent: percent.value })
      if (transferred.value > 0) return t('update.downloadingSize', { size: formatSize(transferred.value) })
      return t('update.downloading', { percent: 0 })
    }
    return t('update.now')
  }

  return { busy, percent, phase, installUpdate, actionLabel }
}
