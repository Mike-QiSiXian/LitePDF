import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useRecentStore = defineStore('recent', () => {
  const items = ref<RecentFileItem[]>([])
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      items.value = await window.litepdf.getRecentFiles()
    } finally {
      loading.value = false
    }
  }

  async function touch(filePath: string) {
    items.value = await window.litepdf.addRecentFile(filePath)
  }

  async function remove(filePath: string) {
    items.value = await window.litepdf.removeRecentFile(filePath)
  }

  async function clear() {
    await window.litepdf.clearRecentFiles()
    items.value = []
  }

  return { items, loading, refresh, touch, remove, clear }
})
