import unactiveUrl from './icons/eraser-unactive.png'
import activeUrl from './icons/eraser-active.png'

/**
 * 批注「局部擦除」图标 class。
 * 用普通 ribbon-button + icon-class，替换内置 fv__icon-toolbar-eraser。
 */
export const ERASER_ICON_CLS = 'litepdf-icon-eraser'

export function ensureEraserIconStyles() {
  if (typeof document === 'undefined') return
  const existing = document.getElementById('litepdf-eraser-icons')
  if (existing) existing.remove()

  const style = document.createElement('style')
  style.id = 'litepdf-eraser-icons'
  style.textContent = `
.${ERASER_ICON_CLS} {
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

[name='eraser-tool'] svg,
.fx-ribbon-item-icon:has(.${ERASER_ICON_CLS}) svg,
.${ERASER_ICON_CLS} svg {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

[name='eraser-tool']:hover .${ERASER_ICON_CLS},
[name='eraser-tool'].fx-ribbon-item-active .${ERASER_ICON_CLS},
[name='eraser-tool'].fx-ribbon-item-selected .${ERASER_ICON_CLS},
[name='eraser-tool'].active .${ERASER_ICON_CLS},
[name='eraser-tool'].selected .${ERASER_ICON_CLS} {
  background-image: url(${JSON.stringify(activeUrl)}) !important;
}
`
  document.head.appendChild(style)
}
