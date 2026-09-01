import { reactive } from 'vue'

export type AppAlertTone = 'info' | 'success' | 'error'

export interface AppAlertState {
  open: boolean
  title: string
  message: string
  tone: AppAlertTone
  confirmText: string
}

const state = reactive<AppAlertState>({
  open: false,
  title: '',
  message: '',
  tone: 'info',
  confirmText: '知道了',
})

export function useAppAlertState() {
  return state
}

export function showAppAlert(options: {
  message: string
  title?: string
  tone?: AppAlertTone
  confirmText?: string
}) {
  state.title = options.title || ''
  state.message = options.message
  state.tone = options.tone || 'info'
  state.confirmText = options.confirmText || '知道了'
  state.open = true
}

export function closeAppAlert() {
  state.open = false
}
