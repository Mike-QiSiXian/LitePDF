<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import WelcomePage from '@/components/WelcomePage.vue'
import PdfTabHost from '@/components/PdfTabHost.vue'
import UpdatePromptDialog from '@/components/UpdatePromptDialog.vue'
import AppAlertDialog from '@/components/AppAlertDialog.vue'
import { closeAppAlert, showAppAlert, useAppAlertState } from '@/composables/useAppAlert'
import { toUserFacingErrorMessage } from '@/foxit/errors'
import { ViewerSessionManager } from '@/foxit/session/ViewerSession'
import { prewarmJrWorkerInBackground, warmupFoxitSdk } from '@/foxit/warmup'
import { useRecentStore } from '@/stores/recent'
import { useTabsStore, WELCOME_TAB_ID } from '@/stores/tabs'

const tabs = useTabsStore()
const recent = useRecentStore()
const appAlert = useAppAlertState()
const sessionManager = new ViewerSessionManager()
const sessionVersion = ref(0)
const dragging = ref(false)
const statusMsg = ref('')
const availableUpdate = ref<UpdateCheckResult | null>(null)

const showWelcome = computed(() => tabs.activeTabId === WELCOME_TAB_ID)

function sessionOf(id: string, filePath: string) {
  // sessionVersion 仅用于在打开新文档后触发视图刷新
  void sessionVersion.value
  return sessionManager.create(id, filePath, hooksFor(id))
}

function askPassword() {
  const value = window.prompt('该 PDF 已加密，请输入密码：', '')
  return Promise.resolve(value)
}

function hooksFor(tabId: string) {
  return {
    onOpenRequest: () => {
      void openFromDialog()
    },
    onSaveRequest: () => {
      void saveActive()
    },
    onDirtyChange: (dirty: boolean) => {
      tabs.setDirty(tabId, dirty)
    },
    onPasswordRequired: askPassword,
    onError: (error: unknown) => {
      statusMsg.value = toUserFacingErrorMessage(error)
    },
  }
}

async function openPaths(paths: string[]) {
  for (const filePath of paths) {
    if (!filePath.toLowerCase().endsWith('.pdf')) continue
    const tab = tabs.openDoc(filePath)
    sessionManager.create(tab.id, tab.path, hooksFor(tab.id))
    sessionVersion.value += 1
    await recent.touch(filePath)
  }
}

async function openFromDialog() {
  const files = await window.litepdf.openPdfDialog()
  if (files.length) await openPaths(files)
}

async function saveActive() {
  const doc = tabs.activeDoc
  if (!doc) return
  const session = sessionManager.get(doc.id)
  if (!session) return
  const target = await window.litepdf.savePdfDialog(session.getFileName())
  if (!target) return
  try {
    await session.saveAs(target)
    tabs.updatePath(doc.id, target)
    await recent.touch(target)
    statusMsg.value = '已保存'
  } catch (e: any) {
    statusMsg.value = e?.message || String(e)
    window.alert(`保存失败：${statusMsg.value}`)
  }
}

async function closeTab(id: string) {
  await sessionManager.close(id)
  tabs.closeDoc(id)
  sessionVersion.value += 1
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const files = [...(e.dataTransfer?.files || [])]
  const paths = files
    .map((f) => window.litepdf.getPathForFile(f))
    .filter((p): p is string => !!p && p.toLowerCase().endsWith('.pdf'))
  if (paths.length) await openPaths(paths)
}

let offOpenFiles: (() => void) | undefined
let offUpdateAvailable: (() => void) | undefined
let offSetDefaultPdf: (() => void) | undefined

function onSaveShortcut() {
  void saveActive()
}

async function setDefaultPdfHandler() {
  if (!window.litepdf.setAsDefaultPdfHandler) return
  try {
    const result = await window.litepdf.setAsDefaultPdfHandler()
    window.dispatchEvent(new CustomEvent('litepdf:pdf-assoc-changed'))
    if (result.message) {
      showAppAlert({
        title: result.isDefault ? '已设为默认应用' : '请在系统设置中确认',
        message: result.message,
        tone: result.isDefault || result.ok ? 'info' : 'error',
      })
    }
  } catch (error) {
    showAppAlert({
      title: '设置失败',
      message: error instanceof Error ? error.message : '设置默认应用失败',
      tone: 'error',
    })
  }
}

onMounted(() => {
  recent.refresh()
  // 开始页预热 SDK 脚本，并后台预创建首个 JR Worker（仅首个 PDFUI 认领，不跨实例共用）
  void warmupFoxitSdk()
    .then(() => prewarmJrWorkerInBackground())
    .catch(() => undefined)
  offOpenFiles = window.litepdf.onOpenFiles((paths) => {
    void openPaths(paths)
  })
  offUpdateAvailable = window.litepdf.onUpdateAvailable((result) => {
    availableUpdate.value = result
  })
  offSetDefaultPdf = window.litepdf.onSetDefaultPdf?.(() => {
    void setDefaultPdfHandler()
  })
  window.addEventListener('litepdf:save', onSaveShortcut)
})

onBeforeUnmount(() => {
  offOpenFiles?.()
  offUpdateAvailable?.()
  offSetDefaultPdf?.()
  window.removeEventListener('litepdf:save', onSaveShortcut)
  void sessionManager.closeAll()
})
</script>

<template>
  <div
    class="lp-shell"
    @dragenter="onDragOver"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <TabBar
      :docs="tabs.docs"
      :active-tab-id="tabs.activeTabId"
      @activate="tabs.activate"
      @close="closeTab"
    />

    <div class="lp-workspace">
      <div class="lp-panel" :hidden="!showWelcome">
        <WelcomePage @open="openFromDialog" @open-path="(p) => openPaths([p])" />
      </div>

      <PdfTabHost
        v-for="doc in tabs.docs"
        :key="doc.id"
        :session="sessionOf(doc.id, doc.path)"
        :active="tabs.activeTabId === doc.id"
      />

      <div v-if="dragging" class="drop-mask">释放以打开 PDF</div>
    </div>

    <UpdatePromptDialog
      v-if="availableUpdate"
      :result="availableUpdate"
      @close="availableUpdate = null"
    />

    <AppAlertDialog
      :open="appAlert.open"
      :title="appAlert.title"
      :message="appAlert.message"
      :tone="appAlert.tone"
      :confirm-text="appAlert.confirmText"
      @close="closeAppAlert"
    />
  </div>
</template>

<style scoped>
.drop-mask {
  position: absolute;
  inset: 8px;
  z-index: 20;
  border: 2px dashed var(--lp-accent);
  border-radius: 12px;
  background: rgba(219, 234, 254, 0.72);
  display: grid;
  place-items: center;
  color: var(--lp-accent);
  font-weight: 600;
  pointer-events: none;
}
</style>
