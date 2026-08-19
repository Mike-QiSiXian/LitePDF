import unactiveUrl from './icons/inksign-unactive.png'
import activeUrl from './icons/inksign-active.png'

/**
 * 批注「手写签名」图标 class。
 * 下拉组件用 Fragment `config.iconCls` 替换内置 fv__icon-toolbar-inksign。
 * 静默态：autograph 钢笔尖；激活态：签名笔迹。
 * @see examples/UIExtension/fragment_usage/replace-buttons-icon.html
 */
export const INKSIGN_ICON_CLS = 'litepdf-icon-inksign'

let stylesReady = false

export function ensureInkSignIconStyles() {
  if (typeof document === 'undefined') return
  // 允许热更新时替换素材：先移除旧 style 再注入
  const existing = document.getElementById('litepdf-inksign-icons')
  if (existing) existing.remove()
  stylesReady = true

  const style = document.createElement('style')
  style.id = 'litepdf-inksign-icons'
  style.textContent = `
.${INKSIGN_ICON_CLS} {
  display: inline-block;
  width: 22px;
  height: 22px;
  background-image: url(${JSON.stringify(unactiveUrl)}) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 22px 22px !important;
  background-color: transparent !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}

[name='fv--ink-sign-dropdown'] svg,
.fx-ribbon-item-icon:has(.${INKSIGN_ICON_CLS}) svg,
.${INKSIGN_ICON_CLS} svg {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

[name='fv--ink-sign-dropdown']:hover .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'].fx-ribbon-item-active .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'].fx-ribbon-item-selected .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'].active .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'].selected .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'].open .${INKSIGN_ICON_CLS},
[name='fv--ink-sign-dropdown'][aria-expanded='true'] .${INKSIGN_ICON_CLS} {
  background-image: url(${JSON.stringify(activeUrl)}) !important;
}
`
  document.head.appendChild(style)
}
