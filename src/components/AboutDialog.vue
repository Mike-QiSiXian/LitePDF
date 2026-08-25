<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const version = ref('—')
const checking = ref(false)
const downloading = ref(false)
const result = ref<UpdateCheckResult | null>(null)

async function loadVersion() {
  try {
    version.value = await window.litepdf.getAppVersion()
  } catch {
    version.value = '未知'
  }
}

async function checkUpdates() {
  checking.value = true
  result.value = null
  try {
    result.value = await window.litepdf.checkForUpdates()
  } catch (error) {
    result.value = {
      status: 'error',
      currentVersion: version.value,
      message: error instanceof Error ? error.message : '检查更新失败',
    }
  } finally {
    checking.value = false
  }
}

async function downloadLatest() {
  if (!result.value?.downloadUrl) return
  downloading.value = true
  try {
    await window.litepdf.downloadUpdate(result.value.downloadUrl)
  } finally {
    downloading.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      result.value = null
      void loadVersion()
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  void loadVersion()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="about-mask" role="presentation" @mousedown.self="emit('close')">
      <section
        class="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <button type="button" class="about-close" aria-label="关闭" @click="emit('close')">
          ×
        </button>

        <div class="about-logo" aria-hidden="true">PDF</div>
        <h2 id="about-title">LitePDF</h2>
        <p class="about-subtitle">轻量、专注的多标签 PDF 阅读器</p>
        <p class="about-version">当前版本 v{{ version }}</p>

        <div
          v-if="result"
          class="update-result"
          :class="`is-${result.status}`"
          role="status"
        >
          <strong v-if="result.status === 'available'">
            发现新版本 v{{ result.latestVersion }}
          </strong>
          <strong v-else-if="result.status === 'up-to-date'">当前已是最新版本</strong>
          <strong v-else-if="result.status === 'error'">检查更新失败</strong>
          <strong v-else>暂时无法检查更新</strong>
          <span>{{ result.message }}</span>
          <span v-if="result.status === 'available'" class="install-tip">
            下载完成后，请运行安装包完成升级。
          </span>
        </div>

        <div class="about-actions">
          <button
            v-if="result?.status === 'available' && result.downloadUrl"
            type="button"
            class="primary-btn"
            :disabled="downloading"
            @click="downloadLatest"
          >
            {{ downloading ? '正在打开下载…' : '下载最新版本' }}
          </button>
          <button
            v-else
            type="button"
            class="primary-btn"
            :disabled="checking"
            @click="checkUpdates"
          >
            {{ checking ? '正在检查…' : '检查更新' }}
          </button>
          <button type="button" class="secondary-btn" @click="emit('close')">关闭</button>
        </div>

        <p class="about-copyright">Copyright © LitePDF</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.about-mask {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(2px);
}

.about-dialog {
  position: relative;
  width: min(420px, calc(100vw - 48px));
  box-sizing: border-box;
  padding: 34px 36px 28px;
  border: 1px solid #e6e8ee;
  border-radius: 16px;
  background: #fff;
  color: #1f2329;
  text-align: center;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.2);
}

.about-close {
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

.about-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.about-logo {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 17px;
  background: linear-gradient(145deg, #4774ff, #244edb);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 24px rgba(45, 90, 247, 0.28);
}

h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.35;
}

.about-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.about-version {
  margin: 12px 0 20px;
  color: #8b93a7;
  font-size: 13px;
}

.update-result {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0 0 18px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.update-result strong {
  color: #334155;
  font-size: 13px;
}

.update-result.is-available {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.update-result.is-available strong {
  color: #1d4ed8;
}

.update-result.is-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.update-result.is-error strong {
  color: #b91c1c;
}

.install-tip {
  color: #64748b;
}

.about-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.primary-btn,
.secondary-btn {
  min-width: 104px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid #2d5af7;
  background: #2d5af7;
  color: #fff;
}

.primary-btn:hover:not(:disabled) {
  background: #244edb;
}

.primary-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.secondary-btn {
  border: 1px solid #d9dde5;
  background: #fff;
  color: #4b5563;
}

.secondary-btn:hover {
  background: #f7f8fa;
}

.about-copyright {
  margin: 22px 0 0;
  color: #a1a8b5;
  font-size: 11px;
}
</style>
