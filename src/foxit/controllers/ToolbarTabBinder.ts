/**
 * 顶栏 gtab 与下方 paddle 联动。
 * 自定义三区顶栏后 toolbar-tabs 曾嵌套在 wrapper 内，导致批注 tab 无法切换工具条；
 * 布局修好后仍保留兜底绑定，确保 hide/show 与 tab 点击一致。
 */

async function getComp(pdfui: any, name: string, timeoutMs = 1000) {
  if (!pdfui?.getComponentByName) return null
  try {
    return await Promise.race([
      Promise.resolve(pdfui.getComponentByName(name)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
  } catch {
    return null
  }
}

type ToolbarTabId = 'home' | 'comment'

function syncPaddles(
  target: ToolbarTabId,
  homePaddle: any,
  commentPaddle: any,
) {
  if (target === 'home') {
    homePaddle?.show?.()
    commentPaddle?.hide?.()
    return
  }
  homePaddle?.hide?.()
  commentPaddle?.show?.()
}

function bindTabClick(tabComp: any, target: ToolbarTabId, homePaddle: any, commentPaddle: any) {
  const el = tabComp?.getElement?.() || tabComp?.element
  if (!el || (el as HTMLElement).dataset.litepdfTabBound === '1') return

  ;(el as HTMLElement).dataset.litepdfTabBound = '1'
  el.addEventListener('click', () => {
    try {
      tabComp?.active?.()
    } catch {
      // ignore
    }
    syncPaddles(target, homePaddle, commentPaddle)
  })
}

export async function bindToolbarTabs(pdfui: any) {
  const [homeTab, commentTab, homePaddle, commentPaddle] = await Promise.all([
    getComp(pdfui, 'home-tab'),
    getComp(pdfui, 'comment-tab'),
    getComp(pdfui, 'fv--home-tab-paddle'),
    getComp(pdfui, 'fv--comment-tab-paddle'),
  ])

  if (!homeTab || !commentTab || !homePaddle || !commentPaddle) return

  bindTabClick(homeTab, 'home', homePaddle, commentPaddle)
  bindTabClick(commentTab, 'comment', homePaddle, commentPaddle)
  syncPaddles('home', homePaddle, commentPaddle)
}
