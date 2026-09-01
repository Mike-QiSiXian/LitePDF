<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isBrowserDebugMode } from '@/browser/litepdf-shim'
import AboutDialog from '@/components/AboutDialog.vue'
import { showAppAlert } from '@/composables/useAppAlert'
import { useRecentStore } from '@/stores/recent'
import { formatSize, formatTime } from '@/utils/path'

const emit = defineEmits<{
  open: []
  openPath: [path: string]
}>()

const recent = useRecentStore()
const browserMode = computed(() => isBrowserDebugMode())

type SortMode = 'recent-desc' | 'recent-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

const SORT_OPTIONS: { id: SortMode; label: string; chip: string }[] = [
  { id: 'recent-desc', label: '最近打开（新→旧）', chip: '↓ 最近' },
  { id: 'recent-asc', label: '最近打开（旧→新）', chip: '↑ 最早' },
  { id: 'name-asc', label: '文件名（A→Z）', chip: '↑ 名称' },
  { id: 'name-desc', label: '文件名（Z→A）', chip: '↓ 名称' },
  { id: 'size-desc', label: '文件大小（大→小）', chip: '↓ 大小' },
  { id: 'size-asc', label: '文件大小（小→大）', chip: '↑ 大小' },
]

const sortMode = ref<SortMode>('recent-desc')
const sortMenuOpen = ref(false)
const aboutOpen = ref(false)
const assoc = ref<PdfAssociationStatus | null>(null)
const assocBusy = ref(false)
let offPdfAssocChanged: (() => void) | undefined
let assocPollTimer: number | undefined

function stopAssocPolling() {
  if (assocPollTimer != null) {
    window.clearInterval(assocPollTimer)
    assocPollTimer = undefined
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
  if (assoc.value?.isDefault || assoc.value?.canSetDefault === false) return
  assocBusy.value = true
  try {
    const result = await window.litepdf.setAsDefaultPdfHandler()
    if (result.isDefault) {
      assoc.value = {
        packaged: true,
        registered: true,
        isDefault: true,
        canSetDefault: false,
        platform: window.litepdf.platform,
        message: result.message,
      }
      stopAssocPolling()
    } else {
      await refreshAssoc()
      // 用户需在系统设置中确认；返回应用后持续轮询，直到真正成为默认
      startAssocPolling()
    }
    window.dispatchEvent(new CustomEvent('litepdf:pdf-assoc-changed'))
    showAppAlert({
      title: result.isDefault ? '已设为默认应用' : '请在系统设置中确认',
      message: result.message,
      tone: result.isDefault || result.ok ? 'info' : 'error',
    })
  } catch (error) {
    showAppAlert({
      title: '设置失败',
      message: error instanceof Error ? error.message : '设置默认应用失败',
      tone: 'error',
    })
  } finally {
    assocBusy.value = false
  }
}

const sortChipLabel = computed(
  () => SORT_OPTIONS.find((o) => o.id === sortMode.value)?.chip ?? '↓ 最近',
)

const sortedItems = computed(() => {
  const list = [...recent.items]
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

  list.sort((a, b) => {
    switch (sortMode.value) {
      case 'recent-asc':
        return a.lastOpenedAt - b.lastOpenedAt
      case 'name-asc':
        return collator.compare(a.name, b.name)
      case 'name-desc':
        return collator.compare(b.name, a.name)
      case 'size-desc':
        return (b.sizeBytes ?? -1) - (a.sizeBytes ?? -1)
      case 'size-asc':
        return (a.sizeBytes ?? Number.POSITIVE_INFINITY) - (b.sizeBytes ?? Number.POSITIVE_INFINITY)
      case 'recent-desc':
      default:
        return b.lastOpenedAt - a.lastOpenedAt
    }
  })
  return list
})

/** 能力卡片：对齐夸克首页结构，内容映射 LitePDF V1 能力 */
const featureCards = [
  {
    id: 'welcome',
    label: '欢迎使用 LitePDF',
    tone: 'welcome',
  },
  {
    id: 'annot',
    label: '批注与高亮',
    tone: 'annot',
  },
  {
    id: 'search',
    label: '全文搜索',
    tone: 'search',
  },
  {
    id: 'tabs',
    label: '多标签阅读',
    tone: 'tabs',
  },
  {
    id: 'save',
    label: '另存带注释',
    tone: 'save',
  },
] as const

function onDocClick() {
  sortMenuOpen.value = false
}

onMounted(() => {
  recent.refresh()
  document.addEventListener('click', onDocClick)
  window.addEventListener('litepdf:pdf-assoc-changed', refreshAssoc)
  offPdfAssocChanged = window.litepdf.onPdfAssociationChanged?.(() => {
    void refreshAssoc()
  })
  void refreshAssoc()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('litepdf:pdf-assoc-changed', refreshAssoc)
  offPdfAssocChanged?.()
  stopAssocPolling()
})

function toggleSortMenu(e: MouseEvent) {
  e.stopPropagation()
  sortMenuOpen.value = !sortMenuOpen.value
}

function selectSort(mode: SortMode, e: MouseEvent) {
  e.stopPropagation()
  sortMode.value = mode
  sortMenuOpen.value = false
}

function showInFolder(filePath: string) {
  void window.litepdf.showItemInFolder?.(filePath)
}
</script>

<template>
  <div class="welcome">
    <div class="welcome-inner">
      <header class="welcome-header">
        <h1 class="brand">LitePDF</h1>
        <div class="header-aside">
          <span class="drag-hint">可将 PDF 拖入窗口打开</span>
        </div>
      </header>

      <p v-if="browserMode" class="browser-banner">
        当前为浏览器调试模式。桌面完整能力请使用 Electron 窗口（npm run dev）。
      </p>

      <!-- 快捷入口：首张为打开，其余为能力示意（对齐夸克卡片行） -->
      <section class="feature-row" aria-label="快捷功能">
        <button type="button" class="feat-card feat-card-open" @click="emit('open')">
          <div class="feat-preview feat-preview-open">
            <span class="plus-btn" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path
                  fill="currentColor"
                  d="M12 5c.55 0 1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1z"
                />
              </svg>
            </span>
            <span class="open-caption">打开新文件</span>
          </div>
          <div class="feat-label">打开PDF文件</div>
        </button>

        <div
          v-for="card in featureCards"
          :key="card.id"
          class="feat-card"
          :class="`feat-card-${card.tone}`"
        >
          <div class="feat-preview" :class="`feat-preview-${card.tone}`">
            <div class="feat-art" aria-hidden="true" />
            <span class="feat-tag">能力</span>
          </div>
          <div class="feat-label">{{ card.label }}</div>
        </div>
      </section>

      <section class="recent">
        <div class="recent-head">
          <h2>最近打开</h2>
          <div class="recent-actions">
            <div class="sort-wrap">
              <button
                type="button"
                class="sort-chip"
                :class="{ open: sortMenuOpen }"
                :disabled="!recent.items.length"
                :aria-expanded="sortMenuOpen"
                aria-haspopup="listbox"
                title="排序方式"
                @click="toggleSortMenu"
              >
                ↑↓ {{ sortChipLabel.replace(/^[↑↓]\s*/, '') }}
              </button>
              <ul
                v-if="sortMenuOpen"
                class="sort-menu"
                role="listbox"
                @click.stop
              >
                <li
                  v-for="opt in SORT_OPTIONS"
                  :key="opt.id"
                  role="option"
                  :aria-selected="sortMode === opt.id"
                >
                  <button
                    type="button"
                    class="sort-option"
                    :class="{ active: sortMode === opt.id }"
                    @click="selectSort(opt.id, $event)"
                  >
                    {{ opt.label }}
                  </button>
                </li>
              </ul>
            </div>
            <button
              type="button"
              class="link-btn"
              :disabled="!recent.items.length"
              @click="recent.clear()"
            >
              清空
            </button>
          </div>
        </div>

        <div v-if="!recent.items.length" class="empty">暂无最近打开的文件</div>
        <ul v-else class="recent-list">
          <li
            v-for="item in sortedItems"
            :key="item.path"
            class="recent-item"
            :class="{ missing: item.missing }"
          >
            <button
              type="button"
              class="recent-main"
              :disabled="item.missing"
              :title="item.path"
              @click="emit('openPath', item.path)"
            >
              <span class="file-thumb" aria-hidden="true">
                <svg viewBox="0 0 40 48" width="28" height="34">
                  <path
                    fill="#e8eefc"
                    stroke="#9db4f0"
                    stroke-width="1.2"
                    d="M6 2h18l10 10v34a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                  />
                  <path fill="#c5d4f7" d="M24 2v8a2 2 0 0 0 2 2h8L24 2z" />
                  <text
                    x="20"
                    y="34"
                    text-anchor="middle"
                    fill="#3b6ef5"
                    font-size="9"
                    font-weight="700"
                    font-family="Segoe UI, sans-serif"
                  >
                    PDF
                  </text>
                </svg>
              </span>
              <span class="file-name">
                {{ item.name }}
                <span v-if="item.missing" class="badge">失效</span>
              </span>
              <span class="file-time">{{ formatTime(item.lastOpenedAt) }}</span>
              <span class="file-size">{{ formatSize(item.sizeBytes) }}</span>
              <span class="file-tag">本地文档</span>
            </button>

            <div class="row-actions">
              <button
                type="button"
                class="icon-btn"
                title="在文件夹中显示"
                :disabled="item.missing || browserMode"
                @click="showInFolder(item.path)"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3.2c.3 0 .6.12.8.34L8.2 3.5H13A1.5 1.5 0 0 1 14.5 5v7A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12V3.5zm1.2.2V12c0 .17.13.3.3.3h10c.17 0 .3-.13.3-.3V5c0-.17-.13-.3-.3-.3H7.9L6.7 3.5H3a.3.3 0 0 0-.3.2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="icon-btn danger"
                title="从列表移除"
                @click="recent.remove(item.path)"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6.2 1.5h3.6c.28 0 .52.18.6.44L10.7 3H13.5a.75.75 0 0 1 0 1.5h-.4l-.55 8.1A1.75 1.75 0 0 1 10.81 14H5.19a1.75 1.75 0 0 1-1.74-1.4L2.9 4.5H2.5a.75.75 0 0 1 0-1.5h2.8l.3-1.06c.08-.26.32-.44.6-.44zm.78 1.5-.18.56h2.4l-.18-.56H6.98zM4.41 4.5l.53 7.85c.03.4.36.7.76.7h5.6c.4 0 .73-.3.76-.7L12.6 4.5H4.4zm2.09 1.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75zm3 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75z"
                  />
                </svg>
              </button>
            </div>
          </li>
        </ul>
      </section>

      <footer class="welcome-footer">
        <button type="button" class="about-link" @click="aboutOpen = true">
          关于 LitePDF
        </button>
        <button
          v-if="!browserMode"
          type="button"
          class="about-link"
          :disabled="assocBusy || assoc?.isDefault || assoc?.canSetDefault === false"
          :title="assoc?.message"
          @click="setDefaultPdf"
        >
          {{
            assocBusy
              ? '正在设置…'
              : assoc?.isDefault
                ? '已是默认 PDF 应用'
                : '设为默认 PDF 阅读器'
          }}
        </button>
      </footer>
    </div>

    <AboutDialog :open="aboutOpen" @close="aboutOpen = false" />
  </div>
</template>

<style scoped>
.welcome {
  --wq-blue: #2d5af7;
  --wq-blue-soft: #e8efff;
  --wq-line: #eef0f3;
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: auto;
  background: #fff;
  color: #1f2329;
}

.welcome-inner {
  width: 100%;
  min-height: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 36px 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.brand {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.header-aside {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drag-hint {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e8eaed;
  background: #fafbfc;
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.browser-banner {
  margin: 0 0 18px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.45;
}

.feature-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 36px;
}

.feat-card {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  min-width: 0;
}

button.feat-card {
  cursor: pointer;
}

button.feat-card:focus-visible {
  outline: 2px solid var(--wq-blue);
  outline-offset: 2px;
  border-radius: 14px;
}

.feat-preview {
  position: relative;
  height: 118px;
  border-radius: 14px;
  border: 1px solid #ebecef;
  background: #f7f8fa;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.feat-preview-open {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(180deg, #eef3ff 0%, #e4ecff 100%);
  border-color: #d7e2ff;
}

.plus-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--wq-blue);
  color: #fff;
  box-shadow: 0 8px 18px rgba(45, 90, 247, 0.35);
}

.feat-card-open:hover .plus-btn {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.open-caption {
  font-size: 13px;
  color: #3b4a6b;
  font-weight: 500;
}

.feat-label {
  margin-top: 10px;
  font-size: 13px;
  color: #333;
  text-align: center;
  line-height: 1.35;
  padding: 0 4px;
}

.feat-tag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 11px;
  color: #8b93a7;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e6e8ee;
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.4;
}

.feat-art {
  position: absolute;
  inset: 14px 12px 22px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e8eaef;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}

/* 能力卡示意插画（CSS，不依赖示例 PDF） */
.feat-preview-welcome .feat-art {
  background:
    linear-gradient(180deg, #fff 0 28%, transparent 28%),
    repeating-linear-gradient(
      180deg,
      #eef1f6 0 8px,
      transparent 8px 16px
    ),
    #fff;
  background-clip: padding-box;
}

.feat-preview-annot .feat-art::before {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  top: 36%;
  height: 10px;
  border-radius: 2px;
  background: rgba(250, 204, 21, 0.55);
}

.feat-preview-annot .feat-art::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 28%;
  top: 58%;
  height: 8px;
  border-radius: 2px;
  background: rgba(45, 90, 247, 0.25);
}

.feat-preview-search .feat-art::before {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid #2d5af7;
  border-radius: 50%;
  left: 28%;
  top: 28%;
  opacity: 0.85;
}

.feat-preview-search .feat-art::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 3px;
  background: #2d5af7;
  border-radius: 2px;
  left: 52%;
  top: 58%;
  transform: rotate(40deg);
  opacity: 0.85;
}

.feat-preview-tabs .feat-art {
  background: transparent;
  border: none;
  box-shadow: none;
}

.feat-preview-tabs .feat-art::before,
.feat-preview-tabs .feat-art::after {
  content: '';
  position: absolute;
  border-radius: 8px;
  border: 1px solid #dbe1ef;
  background: #fff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.feat-preview-tabs .feat-art::before {
  inset: 18% 22% 12% 8%;
  transform: rotate(-6deg);
}

.feat-preview-tabs .feat-art::after {
  inset: 10% 8% 20% 22%;
  transform: rotate(5deg);
  background: linear-gradient(180deg, #eef3ff, #fff);
}

.feat-preview-save .feat-art::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 22%;
  width: 18px;
  height: 18px;
  border-left: 3px solid #2d5af7;
  border-bottom: 3px solid #2d5af7;
  transform: translateX(-50%) rotate(-45deg);
}

.feat-preview-save .feat-art::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 28%;
  width: 3px;
  height: 28px;
  background: #2d5af7;
  transform: translateX(-50%);
  border-radius: 2px;
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.recent-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111;
}

.recent-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-chip {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1.4;
}

.sort-chip:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}

.sort-chip.open {
  background: #eef2ff;
  color: var(--wq-blue);
}

.sort-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sort-wrap {
  position: relative;
}

.sort-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 6px;
  list-style: none;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.sort-option {
  appearance: none;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.sort-option:hover {
  background: #f3f4f6;
}

.sort-option.active {
  background: #eef2ff;
  color: var(--wq-blue);
  font-weight: 600;
}

.link-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 13px;
}

.link-btn:hover:not(:disabled) {
  color: var(--wq-blue);
}

.link-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty {
  padding: 28px 16px;
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
  border-top: 1px solid var(--wq-line);
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--wq-line);
  min-height: 56px;
}

.recent-item.missing {
  opacity: 0.62;
}

.recent-main {
  appearance: none;
  border: none;
  background: transparent;
  display: grid;
  grid-template-columns:
    40px
    minmax(140px, 1.6fr)
    110px
    72px
    72px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 4px;
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
}

.recent-main:hover:not(:disabled) {
  background: #f6f8fc;
}

.recent-main:disabled {
  cursor: not-allowed;
}

.file-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #1f2329;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 4px;
  padding: 1px 6px;
}

.file-time,
.file-size,
.file-tag {
  font-size: 13px;
  color: #8b93a7;
  white-space: nowrap;
}

.file-tag {
  justify-self: start;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.recent-item:hover .row-actions {
  opacity: 1;
}

.icon-btn {
  appearance: none;
  border: none;
  background: transparent;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8b93a7;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: #eef1f6;
  color: #374151;
}

.icon-btn.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.welcome-footer {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 40px;
}

.about-link {
  appearance: none;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b93a7;
  font-size: 12px;
  cursor: pointer;
}

.about-link:hover:not(:disabled) {
  background: #f3f4f6;
  color: var(--wq-blue);
}

.about-link:disabled {
  opacity: 0.65;
  cursor: default;
}

@media (max-width: 1100px) {
  .feature-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .welcome-inner {
    padding: 20px 16px 36px;
  }

  .feature-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .welcome-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .recent-main {
    grid-template-columns: 36px minmax(0, 1fr);
    grid-template-areas:
      'thumb name'
      'thumb meta';
    row-gap: 4px;
  }

  .file-thumb {
    grid-area: thumb;
  }

  .file-name {
    grid-area: name;
  }

  .file-time,
  .file-size,
  .file-tag {
    display: none;
  }

  .row-actions {
    opacity: 1;
  }
}
</style>
