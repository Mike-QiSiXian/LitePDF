<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { isBrowserDebugMode } from '@/browser/litepdf-shim'
import { useRecentStore } from '@/stores/recent'
import { formatTime, summarizePath } from '@/utils/path'

const emit = defineEmits<{
  open: []
  openPath: [path: string]
}>()

const recent = useRecentStore()
const browserMode = computed(() => isBrowserDebugMode())

onMounted(() => {
  recent.refresh()
})
</script>

<template>
  <div class="welcome">
    <div class="welcome-inner">
      <div class="brand">LitePDF</div>
      <p class="lead">轻量个人 PDF 阅读器 — 打开、批注、多标签切换</p>
      <p v-if="browserMode" class="browser-banner">
        当前为浏览器调试模式：可打开/拖入 PDF。桌面安装与系统文件对话框请使用 Electron 窗口（npm run dev）。
      </p>

      <button type="button" class="cta" @click="emit('open')">打开 PDF</button>
      <p class="hint">也可将 PDF 文件拖入窗口打开</p>

      <section class="recent">
        <div class="recent-head">
          <h2>最近文件</h2>
          <button
            type="button"
            class="link-btn"
            :disabled="!recent.items.length"
            @click="recent.clear()"
          >
            清空最近记录
          </button>
        </div>

        <div v-if="!recent.items.length" class="empty">暂无最近打开的文件</div>
        <ul v-else class="recent-list">
          <li
            v-for="item in recent.items"
            :key="item.path"
            class="recent-item"
            :class="{ missing: item.missing }"
          >
            <button
              type="button"
              class="recent-main"
              :disabled="item.missing"
              @click="emit('openPath', item.path)"
            >
              <div class="name">
                {{ item.name }}
                <span v-if="item.missing" class="badge">失效</span>
              </div>
              <div class="meta">{{ summarizePath(item.path) }}</div>
              <div class="time">{{ formatTime(item.lastOpenedAt) }}</div>
            </button>
            <button
              type="button"
              class="remove"
              title="从列表移除"
              @click="recent.remove(item.path)"
            >
              移除
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: auto;
  background:
    radial-gradient(1200px 500px at 20% -10%, #dbeafe 0%, transparent 55%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.welcome-inner {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 24px 40px;
  box-sizing: border-box;
}

.brand {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.lead {
  margin: 10px 0 16px;
  color: var(--lp-muted);
  font-size: 15px;
}

.browser-banner {
  margin: 0 0 20px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.45;
}

.cta {
  appearance: none;
  border: none;
  background: var(--lp-accent);
  color: #fff;
  border-radius: 10px;
  padding: 12px 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.cta:hover {
  filter: brightness(1.05);
}

.hint {
  margin: 12px 0 36px;
  color: var(--lp-muted);
  font-size: 13px;
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recent-head h2 {
  margin: 0;
  font-size: 16px;
}

.link-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--lp-accent);
  cursor: pointer;
  font-size: 13px;
}

.link-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty {
  padding: 20px;
  border: 1px dashed var(--lp-border);
  border-radius: var(--lp-radius);
  color: var(--lp-muted);
  background: rgba(255, 255, 255, 0.6);
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.recent-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: stretch;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border);
  border-radius: var(--lp-radius);
  padding: 4px;
}

.recent-item.missing {
  opacity: 0.75;
}

.recent-main {
  appearance: none;
  border: none;
  background: transparent;
  text-align: left;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 8px;
}

.recent-main:hover:not(:disabled) {
  background: var(--lp-accent-soft);
}

.recent-main:disabled {
  cursor: not-allowed;
}

.name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--lp-danger);
  background: #fee2e2;
  border-radius: 999px;
  padding: 1px 8px;
}

.meta,
.time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--lp-muted);
}

.remove {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--lp-muted);
  padding: 0 12px;
  cursor: pointer;
  font-size: 13px;
}

.remove:hover {
  color: var(--lp-danger);
}
</style>
