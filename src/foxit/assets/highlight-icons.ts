import unactiveUrl from './icons/highlight-unactive.png'
import activeUrl from './icons/highlight-active.png'

/**
 * 批注「文本高亮」图标 class。
 * 对齐官方 Fragment `config.iconCls`；布局里用无内嵌 SVG 的 ribbon-button，
 * 避免预置组件把缺省矢量图画在 PNG 下面。
 * @see examples/UIExtension/fragment_usage/replace-buttons-icon.html
 */
export const HIGHLIGHT_ICON_CLS = 'litepdf-icon-highlight'

let stylesReady = false

export function ensureHighlightIconStyles() {
  if (stylesReady || typeof document === 'undefined') return
  stylesReady = true
  if (document.getElementById('litepdf-highlight-icons')) return

  const style = document.createElement('style')
  style.id = 'litepdf-highlight-icons'
  style.textContent = `
.${HIGHLIGHT_ICON_CLS} {
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

/* 不依赖 .litepdf-tool-paddle：渲染后该类不一定还在祖先链上 */
[name='create-highlight'] svg,
.fx-ribbon-item-icon:has(.${HIGHLIGHT_ICON_CLS}) svg,
.${HIGHLIGHT_ICON_CLS} svg {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}

[name='create-highlight']:hover .${HIGHLIGHT_ICON_CLS},
[name='create-highlight'].fx-ribbon-item-active .${HIGHLIGHT_ICON_CLS},
[name='create-highlight'].fx-ribbon-item-selected .${HIGHLIGHT_ICON_CLS},
[name='create-highlight'].active .${HIGHLIGHT_ICON_CLS},
[name='create-highlight'].selected .${HIGHLIGHT_ICON_CLS} {
  background-image: url(${JSON.stringify(activeUrl)}) !important;
  filter: saturate(1.85) contrast(1.35) brightness(1.08);
}
`
  document.head.appendChild(style)
}
