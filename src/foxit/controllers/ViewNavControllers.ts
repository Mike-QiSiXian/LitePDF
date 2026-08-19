import { getViewHistory } from './ViewHistory'

/**
 * 上一/下一视图 Controller
 * @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/ui-customization/directives/controller.html
 *
 * 注意：不可用时只用 CSS 置灰，不调用 component.disable()，否则 @tooltip 失效。
 */
export function definePrevViewController(UIExtension: any) {
  return {
    mounted(this: any) {
      try {
        const pdfui = this.getPDFUI?.()
        if (!pdfui) return
        const hist = getViewHistory(pdfui, UIExtension)
        hist.attachButton('prev', this.component)
      } catch {
        // ignore
      }
    },

    async handle(this: any) {
      const pdfui = this.getPDFUI?.()
      if (!pdfui) return
      const hist = getViewHistory(pdfui, UIExtension)
      if (!hist.canBack()) return
      await hist.back()
    },
  }
}

export function defineNextViewController(UIExtension: any) {
  return {
    mounted(this: any) {
      try {
        const pdfui = this.getPDFUI?.()
        if (!pdfui) return
        const hist = getViewHistory(pdfui, UIExtension)
        hist.attachButton('next', this.component)
      } catch {
        // ignore
      }
    },

    async handle(this: any) {
      const pdfui = this.getPDFUI?.()
      if (!pdfui) return
      const hist = getViewHistory(pdfui, UIExtension)
      if (!hist.canForward()) return
      await hist.forward()
    },
  }
}
