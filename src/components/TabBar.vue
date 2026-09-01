<script setup lang="ts">
import { useI18n } from '@/i18n'
import { WELCOME_TAB_ID, type DocTab } from '@/stores/tabs'

defineProps<{
  docs: DocTab[]
  activeTabId: string
}>()

const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="lp-tabs" role="tablist">
    <button
      type="button"
      class="lp-tab lp-tab-home"
      :class="{ active: activeTabId === WELCOME_TAB_ID }"
      role="tab"
      :title="t('tabs.home')"
      :aria-label="t('tabs.home')"
      @click="emit('activate', WELCOME_TAB_ID)"
    >
      <svg
        class="lp-tab-home-icon"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M8 1.6 1.8 6.5c-.3.25-.1.7.3.7H4v5.6c0 .3.2.5.5.5h2.2c.3 0 .5-.2.5-.5V9.4h1.6v3.4c0 .3.2.5.5.5h2.2c.3 0 .5-.2.5-.5V7.2h1.9c.4 0 .6-.45.3-.7L8 1.6z"
        />
      </svg>
    </button>

    <div class="lp-tabs-docs">
      <button
        v-for="doc in docs"
        :key="doc.id"
        type="button"
        class="lp-tab lp-tab-doc"
        :class="{ active: activeTabId === doc.id }"
        role="tab"
        :title="doc.path"
        @click="emit('activate', doc.id)"
      >
        <span class="lp-tab-title">{{ doc.dirty ? `${doc.title} *` : doc.title }}</span>
        <span
          class="lp-tab-close"
          :title="t('tabs.close')"
          @click.stop="emit('close', doc.id)"
        >×</span>
      </button>
    </div>

    <!-- 可拖动空白；右侧用 titlebar-area env 预留系统按钮槽，避免挡住关闭键 -->
    <div class="lp-tabs-spacer" aria-hidden="true" />
    <div class="lp-tabs-window-controls-gap" aria-hidden="true" />
  </div>
</template>

<style scoped>
.lp-tabs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  height: env(titlebar-area-height, var(--lp-tab-h));
  min-height: var(--lp-tab-h);
  /* macOS 红绿灯 / Win overlay 安全区：用 env，避免写死像素把布局挤坏 */
  padding: 6px 0 0 max(8px, env(titlebar-area-x, 8px));
  background: #eef1f5;
  border-bottom: 1px solid var(--lp-border);
  overflow: hidden;
  flex-shrink: 0;
  -webkit-app-region: drag;
  app-region: drag;
}

/* macOS：env 不可用时仍避开红绿灯 */
:global(html.platform-darwin) .lp-tabs {
  padding-left: max(72px, env(titlebar-area-x, 72px));
}

.lp-tabs-docs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  /* 只按内容占宽，不与 spacer 对半分 */
  flex: 0 1 auto;
  min-width: 0;
  max-width: calc(100% - 120px);
  overflow: hidden;
  -webkit-app-region: drag;
  app-region: drag;
}

.lp-tabs-spacer {
  flex: 1 1 auto;
  align-self: stretch;
  min-width: 12px;
  -webkit-app-region: drag;
  app-region: drag;
}

/* Overlay 控件占位：titlebar-area-width 为可放内容的宽度，差值即右侧按钮区 */
.lp-tabs-window-controls-gap {
  flex: 0 0 max(0px, calc(100% - env(titlebar-area-width, 100%) - env(titlebar-area-x, 0px)));
  width: max(0px, calc(100% - env(titlebar-area-width, 100%) - env(titlebar-area-x, 0px)));
  min-width: 0;
  align-self: stretch;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.lp-tab {
  appearance: none;
  border: 1px solid transparent;
  border-bottom: none;
  background: transparent;
  color: var(--lp-muted);
  border-radius: 8px 8px 0 0;
  padding: 0 8px;
  height: calc(var(--lp-tab-h) - 7px);
  max-height: 100%;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.lp-tab-home {
  flex: 0 0 auto;
  width: 36px;
  min-width: 36px;
  padding: 0;
  justify-content: center;
}

.lp-tab-home-icon {
  display: block;
  flex-shrink: 0;
  opacity: 0.78;
}

.lp-tab-home:hover .lp-tab-home-icon,
.lp-tab-home.active .lp-tab-home-icon {
  opacity: 1;
}

/* 按标题内容伸展，多标签时再压缩；单标签不再被挤成 B.. */
.lp-tab-doc {
  flex: 0 1 auto;
  width: max-content;
  min-width: 72px;
  max-width: 168px;
  overflow: hidden;
}

.lp-tab:hover {
  background: rgba(255, 255, 255, 0.7);
  color: var(--lp-text);
}

.lp-tab.active {
  background: var(--lp-surface);
  color: var(--lp-text);
  border-color: var(--lp-border);
  box-shadow: 0 -1px 0 var(--lp-surface);
}

.lp-tab-doc .lp-tab-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.lp-tab-close {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: var(--lp-muted);
  flex: 0 0 18px;
}

.lp-tab-close:hover {
  background: #e5e7eb;
  color: var(--lp-text);
}
</style>
