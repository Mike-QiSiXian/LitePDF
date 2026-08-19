/**
 * 批注撤销/重做：对接 WebSDK undo-redo 插件。
 * @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/ui-customization/addons/undo-redo.html
 *
 * 不可用时只用 CSS 置灰，不调用 component.lock()/disable()，以免挡住 @tooltip。
 */

const LOG = '[LitePDF:UndoRedo]'
const EVENT = 'undo-redo-store-change'
const DISABLED_CLS = 'litepdf-undo-disabled'

type ButtonHost = {
  undo?: any
  redo?: any
}

function getEl(comp: any): HTMLElement | null {
  try {
    return (comp?.getElement?.() || comp?.element || null) as HTMLElement | null
  } catch {
    return null
  }
}

/** 仅视觉置灰；始终 unlock/enable，保证 @tooltip 可用 */
function setVisualEnabled(comp: any, enabled: boolean) {
  try {
    comp?.unlock?.()
    comp?.enable?.()
    const el = getEl(comp)
    if (!el) return
    el.classList.toggle(DISABLED_CLS, !enabled)
    el.classList.toggle('disabled', !enabled)
    el.setAttribute('aria-disabled', enabled ? 'false' : 'true')
    el.removeAttribute?.('disabled')
  } catch {
    // ignore
  }
}

function stackSize(stack: any): number {
  if (!stack) return 0
  if (typeof stack.size === 'function') return Number(stack.size()) || 0
  if (Array.isArray(stack.stackArray)) return stack.stackArray.length
  if (typeof stack.length === 'number') return stack.length
  return 0
}

export function createUndoRedoBinder(pdfui: any) {
  const buttons: ButtonHost = {}
  let listening = false
  let undoCtrl: any = null
  let canUndo = false
  let canRedo = false

  function syncButtons() {
    setVisualEnabled(buttons.undo, canUndo)
    setVisualEnabled(buttons.redo, canRedo)
  }

  function applyFromController(ctrl: any | null) {
    undoCtrl = ctrl || null
    const mgr = undoCtrl?.undoRedoManager
    canUndo = stackSize(mgr?.getUndoStack?.() ?? mgr?.undoStack) > 0
    canRedo = stackSize(mgr?.getRedoStack?.() ?? mgr?.redoStack) > 0
    syncButtons()
  }

  function onStoreChange(ctrl: any, reason?: string) {
    // clearAll 时官方传 null；其余批注增删改会带 controller
    if (reason === 'clearAll' || !ctrl) {
      applyFromController(null)
      return
    }
    // touchUp / pageEditor 等非批注栈变更不刷新按钮（与官方控制器一致）
    if (reason === 'touchUp' || reason === 'pageEditor') return
    applyFromController(ctrl)
  }

  function ensureListening() {
    if (listening) return
    listening = true
    try {
      pdfui.addViewerEventListener?.(EVENT, onStoreChange)
    } catch (e) {
      console.warn(LOG, 'addViewerEventListener failed', e)
    }
    syncButtons()
  }

  /** 只同步置灰状态；点击动作交给 @controller handle，避免与 DOM click 双触发 */
  function attachButton(which: 'undo' | 'redo', comp: any) {
    if (!comp) return
    if (which === 'undo') buttons.undo = comp
    else buttons.redo = comp
    syncButtons()
  }

  async function getAddon() {
    try {
      return await pdfui.getAddonInstance?.('UndoRedoAddon')
    } catch (e) {
      console.warn(LOG, 'getAddonInstance failed', e)
      return null
    }
  }

  async function undo() {
    if (!canUndo) return
    const addon = await getAddon()
    if (addon?.undo) {
      await addon.undo()
      return
    }
    // 兜底：直接走事件里缓存的 controller
    try {
      await undoCtrl?.undo?.()
    } catch (e) {
      console.warn(LOG, 'undo failed', e)
    }
  }

  async function redo() {
    if (!canRedo) return
    const addon = await getAddon()
    if (addon?.redo) {
      await addon.redo()
      return
    }
    try {
      await undoCtrl?.redo?.()
    } catch (e) {
      console.warn(LOG, 'redo failed', e)
    }
  }

  function reset() {
    applyFromController(null)
  }

  return {
    ensureListening,
    attachButton,
    syncButtons,
    reset,
    undo,
    redo,
    canUndo: () => canUndo,
    canRedo: () => canRedo,
  }
}

export type UndoRedoBinder = ReturnType<typeof createUndoRedoBinder>

export function getUndoRedoBinder(pdfui: any): UndoRedoBinder {
  if (!pdfui.__litepdfUndoRedo) {
    pdfui.__litepdfUndoRedo = createUndoRedoBinder(pdfui)
  }
  return pdfui.__litepdfUndoRedo as UndoRedoBinder
}

export async function bindUndoRedoButtons(pdfui: any) {
  if (!pdfui) return
  const binder = getUndoRedoBinder(pdfui)
  binder.ensureListening()

  const getByName = async (name: string) => {
    try {
      if (!pdfui.getComponentByName) return null
      return await Promise.race([
        Promise.resolve(pdfui.getComponentByName(name)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])
    } catch {
      return null
    }
  }

  for (let i = 0; i < 40; i++) {
    try {
      const undoBtn = await getByName('litepdf-undo-btn')
      const redoBtn = await getByName('litepdf-redo-btn')
      if (undoBtn) binder.attachButton('undo', undoBtn)
      if (redoBtn) binder.attachButton('redo', redoBtn)
      if (undoBtn && redoBtn) {
        binder.syncButtons()
        return
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 50))
  }
}
