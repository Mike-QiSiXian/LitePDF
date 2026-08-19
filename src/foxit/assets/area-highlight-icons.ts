import unactiveUrl from './icons/area-highlight-unactive.png'
import activeUrl from './icons/area-highlight-active.png'

/**
 * 批注「区域高亮」图标 class。
 * 预置 create-area-highlight-ribbon-button 模板内嵌 SVG，改用普通 ribbon-button + icon-class。
 */
export const AREA_HIGHLIGHT_ICON_CLS = 'litepdf-icon-area-highlight'

let stylesReady = false

export function ensureAreaHighlightIconStyles() {
  if (stylesReady || typeof document === 'undefined') return
  stylesReady = true
  if (document.getElementById('litepdf-area-highlight-icons')) return

  const style = document.createElement('style')
  style.id = 'litepdf-area-highlight-icons'
  style.textContent = `
.${AREA_HIGHLIGHT_ICON_CLS} {
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

[name='create-area-highlight'] svg,
.fx-ribbon-item-icon:has(.${AREA_HIGHLIGHT_ICON_CLS}) svg,
.${AREA_HIGHLIGHT_ICON_CLS} svg {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

[name='create-area-highlight']:hover .${AREA_HIGHLIGHT_ICON_CLS},
[name='create-area-highlight'].fx-ribbon-item-active .${AREA_HIGHLIGHT_ICON_CLS},
[name='create-area-highlight'].fx-ribbon-item-selected .${AREA_HIGHLIGHT_ICON_CLS},
[name='create-area-highlight'].active .${AREA_HIGHLIGHT_ICON_CLS},
[name='create-area-highlight'].selected .${AREA_HIGHLIGHT_ICON_CLS} {
  background-image: url(${JSON.stringify(activeUrl)}) !important;
}
`
  document.head.appendChild(style)
}
