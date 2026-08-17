/**
 * 顶栏侧栏按钮：
 * - 点击展开：默认打开缩略图
 * - 再点：直接收起隐藏侧栏
 * 图标使用用户提供的展开/收起图；悬浮提示固定文案，仅用 SDK @tooltip。
 * @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/ui-customization/basic-components/sidebar.html
 */

import { SIDEBAR_TOGGLE_ICON } from '../assets/sidebar-icons'

export type SidebarNavMode = 'hidden' | 'open'

const PANEL = {
  thumbnail: 'sidebar-thumbnail-panel',
} as const

const TOOLTIP = '缩略图/书签/注释列表'

export function defineSidebarToggleController(UIExtension: any) {
  return {
    mounted(this: any) {
      this.mode = 'hidden' as SidebarNavMode
      this.syncButtonChrome()
      void this.bindSidebarEvents()
    },

    async bindSidebarEvents(this: any) {
      try {
        const sidebar = await this.getComponentByName('sidebar')
        if (!sidebar) return

        const Events = UIExtension.UIConsts?.COMPONENT_EVENTS || {}
        const sync = () => {
          void this.syncModeFromSidebar()
        }

        sidebar.on?.(Events.EXPAND || 'expand', sync)
        sidebar.on?.(Events.COLLAPSE || 'collapse', sync)
      } catch {
        // ignore
      }
    },

    async syncModeFromSidebar(this: any) {
      try {
        const sidebar = await this.getComponentByName('sidebar')
        this.mode = !sidebar || sidebar.isCollapsed?.() ? 'hidden' : 'open'
        this.syncButtonChrome()
      } catch {
        // ignore
      }
    },

    syncButtonChrome(this: any) {
      const mode = (this.mode || 'hidden') as SidebarNavMode
      const icon =
        mode === 'hidden' ? SIDEBAR_TOGGLE_ICON.expand : SIDEBAR_TOGGLE_ICON.collapse

      this.component?.setIconCls?.(icon)

      try {
        this.component?.setAttribute?.('tooltip-title', TOOLTIP)
        const el = this.component?.getElement?.() || this.component?.element
        el?.removeAttribute?.('title')
        el?.classList?.toggle?.('active', mode !== 'hidden')
        el?.classList?.toggle?.('litepdf-sidebar-btn-active', mode !== 'hidden')
      } catch {
        // ignore
      }
    },

    async applyOpen(this: any) {
      const sidebar = await this.getComponentByName('sidebar')
      if (!sidebar) return

      sidebar.expand?.()
      const thumbnail = await this.getComponentByName(PANEL.thumbnail)
      await thumbnail?.active?.()
      this.mode = 'open'
      this.syncButtonChrome()
    },

    async applyHidden(this: any) {
      const sidebar = await this.getComponentByName('sidebar')
      if (!sidebar) return

      if (typeof sidebar.collapseTotally === 'function') sidebar.collapseTotally()
      else sidebar.collapse?.()
      this.mode = 'hidden'
      this.syncButtonChrome()
    },

    async handle(this: any) {
      const sidebar = await this.getComponentByName('sidebar')
      const collapsed = !sidebar || sidebar.isCollapsed?.()

      if (collapsed) {
        await this.applyOpen()
      } else {
        await this.applyHidden()
      }
    },
  }
}
