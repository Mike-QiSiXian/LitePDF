/** 「更多」按钮与菜单项图标（内联 SVG） */

export const MORE_ICON = {
  more: 'litepdf-icon-more',
  browser: 'litepdf-more-icon-browser',
  send: 'litepdf-more-icon-send',
  password: 'litepdf-more-icon-password',
  annot: 'litepdf-more-icon-annot',
  play: 'litepdf-more-icon-play',
  props: 'litepdf-more-icon-props',
  settings: 'litepdf-more-icon-settings',
} as const

const SVGS: Record<string, string> = {
  [MORE_ICON.more]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#333"><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>',
  [MORE_ICON.browser]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6h12"/><circle cx="4" cy="4.5" r=".6" fill="#333" stroke="none"/></svg>',
  [MORE_ICON.send]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.3"><rect x="1.5" y="3" width="9" height="7" rx="1"/><rect x="8" y="7.5" width="6" height="5.5" rx="1"/><path d="M4 12.5h2"/></svg>',
  [MORE_ICON.password]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.4"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/><circle cx="8" cy="10.2" r=".9" fill="#333" stroke="none"/></svg>',
  [MORE_ICON.annot]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.4"><path d="M3 3.5h10a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H7l-3 2.2V4.5a1 1 0 0 1 1-1z"/></svg>',
  [MORE_ICON.play]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M7 6.2v3.6L10.2 8z" fill="#333" stroke="none"/></svg>',
  [MORE_ICON.props]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="5.2" r=".9" fill="#333" stroke="none"/><path d="M8 7.5v4.2" stroke-linecap="round"/></svg>',
  [MORE_ICON.settings]:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#333" stroke-width="1.4"><path d="M3 5.5h10M3 10.5h10" stroke-linecap="round"/><circle cx="6" cy="5.5" r="1.4" fill="#fff"/><circle cx="10" cy="10.5" r="1.4" fill="#fff"/></svg>',
}

function toDataUri(svg: string) {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
}

let ready = false

export function ensureMoreMenuIconStyles() {
  if (ready || typeof document === 'undefined') return
  ready = true
  if (document.getElementById('litepdf-more-menu-icons')) return

  const rules = Object.entries(SVGS)
    .map(
      ([cls, svg]) => `
.${cls} {
  display: inline-block;
  width: 16px;
  height: 16px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 16px 16px;
  background-image: ${toDataUri(svg)};
}`,
    )
    .join('\n')

  const style = document.createElement('style')
  style.id = 'litepdf-more-menu-icons'
  style.textContent = rules
  document.head.appendChild(style)
}
