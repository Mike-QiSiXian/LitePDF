/**
 * 顶栏「更多」按钮：对齐官方 search-bar「查找选项」写法，
 * 点击后在按钮下方弹出 contextmenu（showAt），避免 Grid 顶栏里 dropdown 列表被遮挡。
 */

const MENU_MIN_WIDTH = 220

async function getComp(ctx: any, name: string) {
  try {
    return await Promise.resolve(ctx.getComponentByName(name))
  } catch {
    return null
  }
}

export function defineMoreMenuButtonController() {
  return {
    async handle(this: any) {
      const menu = await getComp(this, 'litepdf-more-menu')
      if (!menu?.showAt) return

      const el = this.component?.getElement?.() || this.component?.element
      const rect = el?.getBoundingClientRect?.()
      if (!rect) return

      const left = Math.max(8, rect.right - MENU_MIN_WIDTH)
      menu.showAt(left, rect.bottom)
    },
  }
}
