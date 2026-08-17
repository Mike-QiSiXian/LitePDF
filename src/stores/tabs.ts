import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const WELCOME_TAB_ID = 'welcome'

export interface DocTab {
  id: string
  path: string
  title: string
  dirty: boolean
}

function makeId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useTabsStore = defineStore('tabs', () => {
  const activeTabId = ref(WELCOME_TAB_ID)
  const docs = ref<DocTab[]>([])

  const activeDoc = computed(() => docs.value.find((d) => d.id === activeTabId.value) || null)
  const isWelcomeActive = computed(() => activeTabId.value === WELCOME_TAB_ID)

  function activateWelcome() {
    activeTabId.value = WELCOME_TAB_ID
  }

  function activate(id: string) {
    if (id === WELCOME_TAB_ID || docs.value.some((d) => d.id === id)) {
      activeTabId.value = id
    }
  }

  function openDoc(filePath: string) {
    const existing = docs.value.find((d) => d.path === filePath)
    if (existing) {
      activeTabId.value = existing.id
      return existing
    }
    const name = filePath.split(/[/\\]/).pop() || 'document.pdf'
    const tab: DocTab = {
      id: makeId(),
      path: filePath,
      title: name,
      dirty: false,
    }
    docs.value.push(tab)
    activeTabId.value = tab.id
    return tab
  }

  function closeDoc(id: string) {
    const idx = docs.value.findIndex((d) => d.id === id)
    if (idx < 0) return
    const wasActive = activeTabId.value === id
    docs.value.splice(idx, 1)
    if (!wasActive) return
    const fallback = docs.value[Math.min(idx, docs.value.length - 1)]
    activeTabId.value = fallback?.id || WELCOME_TAB_ID
  }

  function setDirty(id: string, dirty: boolean) {
    const tab = docs.value.find((d) => d.id === id)
    if (tab) tab.dirty = dirty
  }

  function updatePath(id: string, filePath: string) {
    const tab = docs.value.find((d) => d.id === id)
    if (!tab) return
    tab.path = filePath
    tab.title = filePath.split(/[/\\]/).pop() || tab.title
  }

  return {
    activeTabId,
    docs,
    activeDoc,
    isWelcomeActive,
    activateWelcome,
    activate,
    openDoc,
    closeDoc,
    setDirty,
    updatePath,
  }
})
