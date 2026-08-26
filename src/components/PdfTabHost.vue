<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { toUserFacingErrorMessageWithFallback } from '@/foxit/errors'
import type { ViewerSession } from '@/foxit/session/ViewerSession'

const props = defineProps<{
  session: ViewerSession
  active: boolean
}>()

const hostRef = ref<HTMLElement | null>(null)
const error = ref('')
const loading = ref(false)
let inflight: Promise<void> | null = null

async function restoreAfterVisible() {
  await nextTick()
  await props.session.restoreViewState()
  // Foxit 在面板重新可见后可能异步重算布局，再补一次恢复更稳妥
  requestAnimationFrame(() => {
    void props.session.restoreViewState()
  })
}

async function mountIfNeeded() {
  if (!props.active) return
  if (!hostRef.value) {
    await nextTick()
  }
  const host = hostRef.value
  if (!host) return
  if (inflight) return inflight

  const needsLoading = !props.session.isReady()

  inflight = (async () => {
    if (needsLoading) loading.value = true
    error.value = ''
    try {
      await props.session.ensureMounted(host)
      if (props.active) {
        await restoreAfterVisible()
      }
    } catch (e: unknown) {
      error.value = toUserFacingErrorMessageWithFallback(e)
    } finally {
      if (needsLoading) loading.value = false
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
    if (active) {
      void mountIfNeeded()
      return
    }
    void props.session.captureViewState()
  },
)
</script>

<template>
  <div class="lp-panel" :class="active ? 'is-active' : 'is-inactive'">
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
