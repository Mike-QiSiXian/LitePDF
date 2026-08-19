import { getUndoRedoBinder } from './UndoRedoBinder'

/**
 * 撤销 / 重做 Controller
 * @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/ui-customization/addons/undo-redo.html
 *
 * 不可用时只用 CSS 置灰，不调用 component.lock()/disable()，否则 @tooltip 失效。
 */
export function defineUndoController() {
  return {
    mounted(this: any) {
      try {
        const pdfui = this.getPDFUI?.()
        if (!pdfui) return
        const binder = getUndoRedoBinder(pdfui)
        binder.ensureListening()
        binder.attachButton('undo', this.component)
      } catch {
        // ignore
      }
    },

    async handle(this: any) {
      const pdfui = this.getPDFUI?.()
      if (!pdfui) return
      const binder = getUndoRedoBinder(pdfui)
      if (!binder.canUndo()) return
      await binder.undo()
    },
  }
}

export function defineRedoController() {
  return {
    mounted(this: any) {
      try {
        const pdfui = this.getPDFUI?.()
        if (!pdfui) return
        const binder = getUndoRedoBinder(pdfui)
        binder.ensureListening()
        binder.attachButton('redo', this.component)
      } catch {
        // ignore
      }
    },

    async handle(this: any) {
      const pdfui = this.getPDFUI?.()
      if (!pdfui) return
      const binder = getUndoRedoBinder(pdfui)
      if (!binder.canRedo()) return
      await binder.redo()
    },
  }
}
