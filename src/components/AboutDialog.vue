<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import logoUrl from '@/assets/litepdf-icon.png'
import { showAppAlert } from '@/composables/useAppAlert'
import { useI18n, type UiLanguage } from '@/i18n'
import { describePdfAssociation, describeSetDefaultResult } from '@/i18n/assoc-text'
import { useUpdateInstall } from '@/composables/useUpdateInstall'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, language, changeLanguage } = useI18n()
const { busy: updating, percent: updatePercent, installUpdate, actionLabel } = useUpdateInstall()
const version = ref('—')
const checking = ref(false)
const result = ref<UpdateCheckResult | null>(null)
const assoc = ref<PdfAssociationStatus | null>(null)
const assocBusy = ref(false)
const languageBusy = ref(false)
const showAssoc = computed(() => window.litepdf.platform !== 'browser')
let offPdfAssocChanged: (() => void) | undefined
let assocPollTimer: number | undefined

function stopAssocPolling() {
  if (assocPollTimer != null) {
    window.clearInterval(assocPollTimer)
    assocPollTimer = undefined
  }
}

async function loadVersion() {
  try {
    version.value = await window.litepdf.getAppVersion()
  } catch {
    version.value = t('about.unknownVersion')
  }
}

async function refreshAssoc() {
  if (!window.litepdf.getPdfAssociationStatus) return
  try {
    assoc.value = await window.litepdf.getPdfAssociationStatus()
    if (assoc.value.isDefault) stopAssocPolling()
  } catch {
    assoc.value = null
  }
}

function startAssocPolling() {
  stopAssocPolling()
  let tries = 0
  assocPollTimer = window.setInterval(() => {
    tries += 1
    void refreshAssoc()
    if (tries >= 20) stopAssocPolling()
  }, 1500)
}

async function setDefaultPdf() {
  if (!window.litepdf.setAsDefaultPdfHandler) return
  if (assoc.value?.isDefault || !assoc.value?.canSetDefault) return
  assocBusy.value = true
  try {
    const outcome = await window.litepdf.setAsDefaultPdfHandler()
    if (outcome.isDefault) {
      assoc.value = {
        packaged: true,
        registered: true,
        isDefault: true,
        canSetDefault: false,
        platform: window.litepdf.platform,
        message: outcome.message,
      }
      stopAssocPolling()
    } else {
      await refreshAssoc()
      startAssocPolling()
    }
    window.dispatchEvent(new CustomEvent('litepdf:pdf-assoc-changed'))
    showAppAlert({
      title: outcome.isDefault ? t('alert.setDefaultSuccess') : t('alert.setDefaultConfirm'),
      message: describeSetDefaultResult({
        ok: outcome.ok,
        isDefault: outcome.isDefault,
        openedSystemSettings: outcome.openedSystemSettings,
        message: outcome.message,
        platform: String(window.litepdf.platform),
      }),
      tone: outcome.isDefault || outcome.ok ? 'info' : 'error',
    })
  } catch (error) {
    showAppAlert({
      title: t('alert.setDefaultFailed'),
      message: error instanceof Error ? error.message : t('app.setDefaultFailedMessage'),
      tone: 'error',
    })
  } finally {
    assocBusy.value = false
  }
}


const assocDescription = computed(() => {
  void language.value
  return assoc.value ? describePdfAssociation(assoc.value) : ''
})

async function switchLanguage(next: UiLanguage) {
  if (next === language.value || languageBusy.value) return
  languageBusy.value = true
  try {
    await changeLanguage(next)
  } finally {
    languageBusy.value = false
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
      message: error instanceof Error ? error.message : t('about.checkFailed'),
    }
  } finally {
    checking.value = false
  }
}

async function downloadLatest() {
  if (!result.value?.downloadUrl) return
  await installUpdate(result.value.downloadUrl)
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
  offPdfAssocChanged = window.litepdf.onPdfAssociationChanged?.(() => {
    void refreshAssoc()
  })
  void loadVersion()
  void refreshAssoc()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('litepdf:pdf-assoc-changed', refreshAssoc)
  offPdfAssocChanged?.()
  stopAssocPolling()
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
        <button type="button" class="about-close" :aria-label="t('about.closeAria')" @click="emit('close')">
          ×
        </button>

        <div class="about-header">
          <img class="about-logo" :src="logoUrl" alt="" aria-hidden="true" />
          <h2 id="about-title">LitePDF</h2>
          <p class="about-subtitle">{{ t('about.subtitle') }}</p>
          <p class="about-version">{{ t('about.currentVersion', { version }) }}</p>
        </div>

        <div class="lang-box" role="group" :aria-label="t('about.language')">
          <strong>{{ t('about.language') }}</strong>
          <div class="lang-switch">
            <button
              type="button"
              class="lang-btn"
              :class="{ active: language === 'zh-CN' }"
              :disabled="languageBusy"
              @click="switchLanguage('zh-CN')"
            >
              {{ t('about.simplifiedChinese') }}
            </button>
            <button
              type="button"
              class="lang-btn"
              :class="{ active: language === 'en-US' }"
              :disabled="languageBusy"
              @click="switchLanguage('en-US')"
            >
              {{ t('about.english') }}
            </button>
          </div>
        </div>

        <div v-if="assoc && showAssoc" class="assoc-box">
          <strong>{{ assoc.isDefault ? t('about.alreadyDefault') : t('about.systemAssoc') }}</strong>
          <span>{{ assocDescription }}</span>
          <button
            type="button"
            class="secondary-btn assoc-btn"
            :disabled="assocBusy || assoc.isDefault || !assoc.canSetDefault"
            @click="setDefaultPdf"
          >
            {{
              assocBusy
                ? t('about.setting')
                : assoc.isDefault
                  ? t('about.setAsDefaultDone')
                  : t('about.setAsDefault')
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
              {{ t('about.newVersion', { version: result.latestVersion || '' }) }}
            </strong>
            <strong v-else-if="result.status === 'up-to-date'">{{ t('about.upToDate') }}</strong>
            <strong v-else-if="result.status === 'error'">{{ t('about.checkFailed') }}</strong>
            <strong v-else>{{ t('about.checkUnavailable') }}</strong>
            <span>{{ result.message }}</span>
            <span v-if="result.status === 'available'" class="install-tip">
              {{ t('about.installTip') }}
            </span>
          </div>
          <div
            v-if="result.status === 'available' && result.releaseNotes && result.latestVersion"
            class="release-notes"
          >
            <strong>{{ t('about.releaseNotes', { version: result.latestVersion }) }}</strong>
            <pre>{{ result.releaseNotes }}</pre>
          </div>
        </div>

        <div
          v-if="updating"
          class="update-progress"
          role="progressbar"
          :aria-valuenow="updatePercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="update-progress-bar" :style="{ width: `${updatePercent}%` }" />
        </div>

        <div class="about-footer">
          <div class="about-actions">
            <button
            v-if="result?.status === 'available' && result.downloadUrl"
            type="button"
            class="primary-btn"
            :disabled="updating"
            @click="downloadLatest"
          >
            {{ actionLabel() }}
          </button>
          <button
            v-else
            type="button"
            class="primary-btn"
            :disabled="checking"
            @click="checkUpdates"
          >
            {{ checking ? t('about.checking') : t('about.checkUpdate') }}
          </button>
          <button type="button" class="secondary-btn" @click="emit('close')">{{ t('common.close') }}</button>
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
  margin: 12px 0 0;
  color: #8b93a7;
  font-size: 13px;
}

.lang-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  margin: 18px 0 0;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  text-align: left;
}

.lang-box strong {
  color: #334155;
  font-size: 13px;
}

.lang-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.lang-btn {
  height: 34px;
  border: 1px solid #d9dde5;
  border-radius: 8px;
  background: #fff;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
}

.lang-btn:hover:not(:disabled) {
  background: #f7f8fa;
}

.lang-btn.active {
  border-color: #2d5af7;
  background: #eff4ff;
  color: #2d5af7;
  font-weight: 600;
}

.lang-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.assoc-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  margin: 16px 0;
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

.update-progress {
  flex-shrink: 0;
  height: 6px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.update-progress-bar {
  height: 100%;
  border-radius: inherit;
  background: #0ea5e9;
  transition: width 0.2s ease;
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

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary-btn {
  border: 1px solid #d9dde5;
  background: #fff;
  color: #4b5563;
}

.secondary-btn:hover:not(:disabled) {
  background: #f7f8fa;
}

.about-copyright {
  margin: 14px 0 0;
  color: #a1a8b5;
  font-size: 11px;
}
</style>
