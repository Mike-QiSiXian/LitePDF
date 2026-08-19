import unactiveUrl from './icons/pencil-unactive.png'
import activeUrl from './icons/pencil-active.png'

/**
 * 批注「铅笔」图标 class。
 * 预置 create-pencil-ribbon-button 模板内嵌 SVG，改用普通 ribbon-button + icon-class。
 */
export const PENCIL_ICON_CLS = 'litepdf-icon-pencil'

export function ensurePencilIconStyles() {
  if (typeof document === 'undefined') return
  const existing = document.getElementById('litepdf-pencil-icons')
  if (existing) existing.remove()

  const style = document.createElement('style')
  style.id = 'litepdf-pencil-icons'
  style.textContent = `
.${PENCIL_ICON_CLS} {
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

[name='pencil-tool'] svg,
.fx-ribbon-item-icon:has(.${PENCIL_ICON_CLS}) svg,
.${PENCIL_ICON_CLS} svg {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

[name='pencil-tool']:hover .${PENCIL_ICON_CLS},
[name='pencil-tool'].fx-ribbon-item-active .${PENCIL_ICON_CLS},
[name='pencil-tool'].fx-ribbon-item-selected .${PENCIL_ICON_CLS},
[name='pencil-tool'].active .${PENCIL_ICON_CLS},
[name='pencil-tool'].selected .${PENCIL_ICON_CLS} {
  background-image: url(${JSON.stringify(activeUrl)}) !important;
}
`
  document.head.appendChild(style)
}
