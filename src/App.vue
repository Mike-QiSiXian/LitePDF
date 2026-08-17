<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import WelcomePage from '@/components/WelcomePage.vue'
import PdfTabHost from '@/components/PdfTabHost.vue'
import { ViewerSessionManager } from '@/foxit/session/ViewerSession'
import { useRecentStore } from '@/stores/recent'
import { useTabsStore, WELCOME_TAB_ID } from '@/stores/tabs'

const tabs = useTabsStore()
const recent = useRecentStore()
const sessionManager = new ViewerSessionManager()
const sessionVersion = ref(0)
const dragging = ref(false)
const statusMsg = ref('')

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
      statusMsg.value = error instanceof Error ? error.message : String(error)
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

onMounted(() => {
  recent.refresh()
  offOpenFiles = window.litepdf.onOpenFiles((paths) => {
    void openPaths(paths)
  })
  window.addEventListener('litepdf:save', () => {
    void saveActive()
  })
})

onBeforeUnmount(() => {
  offOpenFiles?.()
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
