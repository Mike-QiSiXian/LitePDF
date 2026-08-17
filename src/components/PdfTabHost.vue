<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ViewerSession } from '@/foxit/session/ViewerSession'

const props = defineProps<{
  session: ViewerSession
  active: boolean
}>()

const hostRef = ref<HTMLElement | null>(null)
const error = ref('')
const loading = ref(false)

async function mountIfNeeded() {
  if (!props.active || !hostRef.value) return
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await props.session.ensureMounted(hostRef.value)
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(mountIfNeeded)
watch(() => props.active, mountIfNeeded)

onBeforeUnmount(async () => {
  // 会话销毁由上层 SessionManager 负责
})
</script>

<template>
  <div class="lp-panel" :hidden="!active">
    <div v-if="loading" class="state">正在加载 PDF…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div ref="hostRef" class="lp-viewer-host" />
  </div>
</template>

<style scoped>
.state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
  background: rgba(246, 247, 249, 0.88);
  color: var(--lp-muted);
}

.state.error {
  color: var(--lp-danger);
  padding: 24px;
  text-align: center;
}
</style>
