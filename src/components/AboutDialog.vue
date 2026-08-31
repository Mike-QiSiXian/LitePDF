<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import logoUrl from '@/assets/litepdf-icon.png'

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
const assoc = ref<PdfAssociationStatus | null>(null)
const assocBusy = ref(false)
const showAssoc = computed(() => window.litepdf.platform !== 'browser')

async function loadVersion() {
  try {
    version.value = await window.litepdf.getAppVersion()
  } catch {
    version.value = '未知'
  }
}

async function refreshAssoc() {
  if (!window.litepdf.getPdfAssociationStatus) return
  try {
    assoc.value = await window.litepdf.getPdfAssociationStatus()
  } catch {
    assoc.value = null
  }
}

async function setDefaultPdf() {
  if (!window.litepdf.setAsDefaultPdfHandler) return
  assocBusy.value = true
  try {
    const outcome = await window.litepdf.setAsDefaultPdfHandler()
    await refreshAssoc()
    window.dispatchEvent(new CustomEvent('litepdf:pdf-assoc-changed'))
    window.alert(outcome.message)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '设置默认应用失败')
  } finally {
    assocBusy.value = false
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
      void refreshAssoc()
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('litepdf:pdf-assoc-changed', refreshAssoc)
  void loadVersion()
  void refreshAssoc()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('litepdf:pdf-assoc-changed', refreshAssoc)
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

        <div class="about-header">
          <img class="about-logo" :src="logoUrl" alt="" aria-hidden="true" />
          <h2 id="about-title">LitePDF</h2>
          <p class="about-subtitle">轻量、专注的多标签 PDF 阅读器</p>
          <p class="about-version">当前版本 v{{ version }}</p>
        </div>

        <div v-if="assoc && showAssoc" class="assoc-box">
          <strong>{{ assoc.isDefault ? '已是默认 PDF 应用' : '系统 PDF 关联' }}</strong>
          <span>{{ assoc.message }}</span>
          <button
            type="button"
            class="secondary-btn assoc-btn"
            :disabled="assocBusy || assoc.isDefault || !assoc.canSetDefault"
            @click="setDefaultPdf"
          >
            {{
              assocBusy
                ? '正在设置…'
                : assoc.isDefault
                  ? '已设为默认'
                  : '设为默认 PDF 阅读器'
            }}
          </button>
        </div>

        <div
          v-if="result"
          class="update-result"
          :class="`is-${result.status}`"
          role="status"
        >
          <div class="update-summary">
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
          <div
            v-if="result.status === 'available' && result.releaseNotes && result.latestVersion"
            class="release-notes"
          >
            <strong>v{{ result.latestVersion }} 更新内容</strong>
            <pre>{{ result.releaseNotes }}</pre>
          </div>
        </div>

        <div class="about-footer">
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
        </div>
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
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100vw - 48px));
  max-height: min(680px, calc(100vh - 48px));
  box-sizing: border-box;
  padding: 34px 36px 28px;
  border: 1px solid #e6e8ee;
  border-radius: 16px;
  background: #fff;
  color: #1f2329;
  text-align: center;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.about-header {
  flex-shrink: 0;
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
  display: block;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 17px;
  object-fit: cover;
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

.assoc-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  margin: -8px 0 16px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

.assoc-box strong {
  color: #334155;
  font-size: 13px;
}

.assoc-btn {
  align-self: flex-start;
  min-width: 0;
  margin-top: 4px;
}

.update-result {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0;
  min-height: 0;
  margin: 0 0 18px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  overflow: hidden;
}

.update-summary {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
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

.release-notes {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.3);
}

.release-notes pre {
  flex: 1 1 auto;
  min-height: 0;
  margin: 6px 0 0;
  overflow-y: auto;
  overflow-wrap: anywhere;
  color: #475569;
  font: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
}

.about-footer {
  flex-shrink: 0;
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
  margin: 14px 0 0;
  color: #a1a8b5;
  font-size: 11px;
}
</style>
