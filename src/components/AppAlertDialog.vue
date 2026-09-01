<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  message: string
  tone?: 'info' | 'success' | 'error'
  confirmText?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape' || event.key === 'Enter') {
    event.preventDefault()
    emit('close')
  }
}

watch(
  () => props.open,
  (open, _, onCleanup) => {
    if (!open) return
    document.addEventListener('keydown', onKeydown)
    onCleanup(() => document.removeEventListener('keydown', onKeydown))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="app-alert-mask"
      role="presentation"
      @mousedown.self="emit('close')"
    >
      <section
        class="app-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="title ? 'app-alert-title' : undefined"
        aria-describedby="app-alert-message"
      >
        <button type="button" class="app-alert-close" aria-label="关闭" @click="emit('close')">
          ×
        </button>

        <div class="app-alert-icon" :class="`is-${tone || 'info'}`" aria-hidden="true">
          <svg v-if="tone === 'success'" viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M9.2 16.6 4.8 12.2a1 1 0 0 1 1.4-1.4l3 3 7.4-7.4a1 1 0 1 1 1.4 1.4l-8.1 8.8a1 1 0 0 1-1.5 0z"
            />
          </svg>
          <svg v-else-if="tone === 'error'" viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm0 10.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 5.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM11 11h2v7h-2v-7z"
            />
          </svg>
        </div>

        <h2 v-if="title" id="app-alert-title" class="app-alert-title">{{ title }}</h2>
        <p id="app-alert-message" class="app-alert-message">{{ message }}</p>

        <div class="app-alert-actions">
          <button type="button" class="primary-btn" @click="emit('close')">
            {{ confirmText || '知道了' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.app-alert-mask {
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(2px);
}

.app-alert-dialog {
  position: relative;
  width: min(400px, calc(100vw - 48px));
  box-sizing: border-box;
  padding: 28px 28px 24px;
  border: 1px solid #e6e8ee;
  border-radius: 16px;
  background: #fff;
  color: #1f2329;
  text-align: center;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.2);
}

.app-alert-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8b93a7;
  font-size: 22px;
  line-height: 28px;
  cursor: pointer;
}

.app-alert-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.app-alert-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  border-radius: 14px;
}

.app-alert-icon.is-info {
  background: #eff6ff;
  color: #2563eb;
}

.app-alert-icon.is-success {
  background: #ecfdf5;
  color: #059669;
}

.app-alert-icon.is-error {
  background: #fef2f2;
  color: #dc2626;
}

.app-alert-title {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 650;
}

.app-alert-message {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.65;
  text-align: left;
  white-space: pre-wrap;
}

.app-alert-actions {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.primary-btn {
  min-width: 104px;
  height: 36px;
  padding: 0 18px;
  border: 1px solid #2d5af7;
  border-radius: 8px;
  background: #2d5af7;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.primary-btn:hover {
  background: #244edb;
}
</style>
