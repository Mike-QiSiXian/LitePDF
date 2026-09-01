<script setup lang="ts">
import { useUpdateInstall } from '@/composables/useUpdateInstall'
import { useI18n } from '@/i18n'

const props = defineProps<{
  result: UpdateCheckResult
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, language } = useI18n()
const { busy, percent, phase, installUpdate, actionLabel } = useUpdateInstall()

function formatDate(value?: string) {
  if (!value) return ''
  void language.value
  return new Intl.DateTimeFormat(language.value, { dateStyle: 'long' }).format(new Date(value))
}
</script>

<template>
  <Teleport to="body">
    <div class="update-mask" role="presentation" @mousedown.self="!busy && emit('close')">
      <section class="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button
          type="button"
          class="close-btn"
          :aria-label="t('update.remindLater')"
          :disabled="busy"
          @click="emit('close')"
        >
          ×
        </button>
        <div class="update-header">
          <div class="update-badge">{{ t('update.badge') }}</div>
          <h2 id="update-title">LitePDF v{{ result.latestVersion }}</h2>
          <p v-if="result.publishedAt" class="published-at">
            {{ t('update.publishedAt', { date: formatDate(result.publishedAt) }) }}
          </p>
        </div>
        <div class="release-notes">
          <h3>{{ t('update.releaseNotes') }}</h3>
          <pre>{{ result.releaseNotes || t('update.noNotes') }}</pre>
        </div>
        <div v-if="busy" class="progress" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" :style="{ width: `${percent}%` }" />
        </div>
        <div class="actions">
          <button type="button" class="secondary-btn" :disabled="busy" @click="emit('close')">
            {{ t('common.later') }}
          </button>
          <button
            type="button"
            class="primary-btn"
            :disabled="busy || !result.downloadUrl"
            @click="installUpdate(result.downloadUrl)"
          >
            {{ actionLabel() }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.update-mask {
  position: fixed;
  inset: 0;
  z-index: 31000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(3px);
}

.update-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(520px, calc(100vw - 48px));
  max-height: min(680px, calc(100vh - 48px));
  box-sizing: border-box;
  overflow: hidden;
  padding: 30px 32px 28px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  color: #1f2937;
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.24);
}

.update-header {
  flex-shrink: 0;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 14px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
}

.close-btn:disabled {
  cursor: wait;
  opacity: 0.5;
}

.update-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
}

h2 {
  margin: 12px 0 0;
  font-size: 24px;
}

.published-at {
  margin: 6px 0 20px;
  color: #94a3b8;
  font-size: 12px;
}

.release-notes {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.release-notes h3 {
  flex-shrink: 0;
  margin: 0 0 10px;
  font-size: 14px;
}

.release-notes pre {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  overflow-y: auto;
  overflow-wrap: anywhere;
  color: #475569;
  font: inherit;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.progress {
  height: 6px;
  margin-top: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: #0ea5e9;
  transition: width 0.2s ease;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  margin-top: 22px;
}

.primary-btn,
.secondary-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 9px;
  font-size: 13px;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid #0ea5e9;
  background: #0ea5e9;
  color: #fff;
}

.secondary-btn {
  border: 1px solid #d8dee8;
  background: #fff;
  color: #475569;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
