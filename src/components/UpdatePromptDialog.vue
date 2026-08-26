<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  result: UpdateCheckResult
}>()

const emit = defineEmits<{
  close: []
}>()

const downloading = ref(false)

async function downloadUpdate() {
  if (!props.result.downloadUrl) return
  downloading.value = true
  try {
    await window.litepdf.downloadUpdate(props.result.downloadUrl)
    emit('close')
  } finally {
    downloading.value = false
  }
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(value))
}
</script>

<template>
  <Teleport to="body">
    <div class="update-mask" role="presentation" @mousedown.self="emit('close')">
      <section class="update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title">
        <button type="button" class="close-btn" aria-label="稍后提醒" @click="emit('close')">×</button>
        <div class="update-badge">新版本</div>
        <h2 id="update-title">LitePDF v{{ result.latestVersion }}</h2>
        <p v-if="result.publishedAt" class="published-at">
          发布于 {{ formatDate(result.publishedAt) }}
        </p>
        <div class="release-notes">
          <h3>更新内容</h3>
          <pre>{{ result.releaseNotes || '本版本暂无更新说明。' }}</pre>
        </div>
        <div class="actions">
          <button type="button" class="secondary-btn" @click="emit('close')">稍后</button>
          <button
            type="button"
            class="primary-btn"
            :disabled="downloading || !result.downloadUrl"
            @click="downloadUpdate"
          >
            {{ downloading ? '正在打开下载…' : '下载更新' }}
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
  width: min(520px, calc(100vw - 48px));
  max-height: min(680px, calc(100vh - 48px));
  box-sizing: border-box;
  overflow: auto;
  padding: 30px 32px 28px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  color: #1f2937;
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.24);
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
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.release-notes h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.release-notes pre {
  margin: 0;
  overflow-wrap: anywhere;
  color: #475569;
  font: inherit;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.primary-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
