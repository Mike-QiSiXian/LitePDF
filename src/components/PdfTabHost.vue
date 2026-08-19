<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { ViewerSession } from '@/foxit/session/ViewerSession'

const props = defineProps<{
  session: ViewerSession
  active: boolean
}>()

const hostRef = ref<HTMLElement | null>(null)
const error = ref('')
const loading = ref(false)
let inflight: Promise<void> | null = null

async function mountIfNeeded() {
  if (!props.active) return
  if (!hostRef.value) {
    loading.value = true
    await nextTick()
  }
  const host = hostRef.value
  if (!host) return
  if (inflight) return inflight

  inflight = (async () => {
    loading.value = true
    error.value = ''
    try {
      // ensureMounted 在 WebSDK open-file-success 回调里结束
      await props.session.ensureMounted(host)
    } catch (e: any) {
      error.value = e?.message || String(e)
    } finally {
      loading.value = false
    }
  })().finally(() => {
    inflight = null
  })

  return inflight
}

onMounted(() => {
  void mountIfNeeded()
})

watch(
  () => props.active,
  (active) => {
    if (active) void mountIfNeeded()
  },
)
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
  z-index: 5000;
  background: rgba(246, 247, 249, 0.88);
  color: var(--lp-muted);
}

.state.error {
  color: var(--lp-danger);
  padding: 24px;
  text-align: center;
}
</style>
