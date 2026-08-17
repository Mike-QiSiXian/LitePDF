import { LITE_LAYOUT_TEMPLATE } from './layout-template'
import { createV1Fragments } from '../fragments/v1-fragments'

/**
 * 自定义 Appearance：三区顶栏 + 精简 paddle 工具条
 * 右侧操作与侧栏切换在布局模板中通过 @controller 挂接
 */
export function createLiteAppearance(UIExtension: any) {
  const proto = {
    getLayoutTemplate() {
      return LITE_LAYOUT_TEMPLATE
    },
    getDefaultFragments() {
      return createV1Fragments(UIExtension)
    },
    beforeMounted(this: any, rootComponent: any) {
      this.rootComponent = rootComponent
      this.toolbarComponent = rootComponent.getComponentByName('toolbar')
      this.sidebarComponent = rootComponent.getComponentByName('sidebar')
    },
    afterMounted(this: any) {
      const host = this.rootComponent?.getElement?.() || this.rootComponent?.element
      host?.classList?.add('litepdf-root')

      // 默认收起侧栏（与无 open 属性一致；确保状态干净）
      try {
        if (typeof this.sidebarComponent?.collapseTotally === 'function') {
          this.sidebarComponent.collapseTotally()
        } else {
          this.sidebarComponent?.collapse?.()
        }
      } catch {
        // ignore
      }
    },
    disableAll(this: any) {
      this.toolbarComponent?.disable?.()
    },
    enableAll(this: any) {
      this.toolbarComponent?.enable?.()
    },
  }

  const Base = UIExtension.appearances.Appearance
  if (typeof Base.extend === 'function') {
    return Base.extend(proto)
  }
  return UIExtension.PDFViewCtrl.shared.createClass(proto, Base)
}
