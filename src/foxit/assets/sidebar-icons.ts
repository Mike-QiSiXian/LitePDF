/* 使用用户提供的图标原图（工作区内已保存为 png；同目录另有矢量 svg 备份） */
import expandUrl from './icons/sidebar-expand.png'
import collapseUrl from './icons/sidebar-collapse.png'

/** 自定义侧栏按钮图标 class（对应用户提供的展开/收起图） */
export const SIDEBAR_TOGGLE_ICON = {
  /** 侧栏隐藏：显示「展开」双箭头 >> */
  expand: 'litepdf-icon-sidebar-expand',
  /** 侧栏展开：显示「收起」双箭头 << */
  collapse: 'litepdf-icon-sidebar-collapse',
} as const

let stylesReady = false

/** 注入背景图样式，供 xbutton 的 icon-class / setIconCls 使用 */
export function ensureSidebarToggleIconStyles() {
  if (stylesReady || typeof document === 'undefined') return
  stylesReady = true
  if (document.getElementById('litepdf-sidebar-toggle-icons')) return

  const style = document.createElement('style')
  style.id = 'litepdf-sidebar-toggle-icons'
  style.textContent = `
.litepdf-icon-sidebar-expand,
.litepdf-icon-sidebar-collapse {
  display: inline-block;
  width: 100%;
  height: 100%;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px 16px;
}
.litepdf-icon-sidebar-expand {
  background-image: url(${JSON.stringify(expandUrl)});
}
.litepdf-icon-sidebar-collapse {
  background-image: url(${JSON.stringify(collapseUrl)});
}
`
  document.head.appendChild(style)
}
