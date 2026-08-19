import { ensureAreaHighlightIconStyles } from '../assets/area-highlight-icons'
import { ensureEraserIconStyles } from '../assets/eraser-icons'
import { ensureHighlightIconStyles } from '../assets/highlight-icons'
import { ensureInkSignIconStyles } from '../assets/inksign-icons'
import { ensureMoreMenuIconStyles } from '../assets/more-menu-icons'
import { ensurePencilIconStyles } from '../assets/pencil-icons'
import { ensureSidebarToggleIconStyles } from '../assets/sidebar-icons'
import { defineMoreMenuButtonController } from './MoreMenuButtonController'
import { defineMoreMenuController } from './MoreMenuController'
import { defineSidebarToggleController } from './SidebarToggleController'
import {
  defineRedoController,
  defineUndoController,
} from './UndoRedoControllers'
import {
  defineNextViewController,
  definePrevViewController,
} from './ViewNavControllers'

/**
 * 统一注册 litepdf 模块下所有自研 Controller（幂等）。
 * @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/ui-customization/directives/controller.html
 */
export function registerLiteControllers(UIExtension: any) {
  ensureSidebarToggleIconStyles()
  ensureMoreMenuIconStyles()
  ensureHighlightIconStyles()
  ensureAreaHighlightIconStyles()
  ensurePencilIconStyles()
  ensureEraserIconStyles()
  ensureInkSignIconStyles()

  let mod: any
  try {
    mod = UIExtension.PDFUI.module('litepdf')
  } catch {
    try {
      mod = UIExtension.PDFUI.module('litepdf', [])
    } catch {
      return
    }
  }

  const bag: Set<string> = (UIExtension.__litepdfControllers ||= new Set())

  const register = (name: string, factory: () => unknown) => {
    if (bag.has(name)) return
    try {
      mod.controller(name, factory())
    } catch {
      // 已注册
    }
    bag.add(name)
  }

  register('SidebarToggleController', () => defineSidebarToggleController(UIExtension))
  register('MoreMenuButtonController', () => defineMoreMenuButtonController())
  register('MoreMenuController', () => defineMoreMenuController())
  register('PrevViewController', () => definePrevViewController(UIExtension))
  register('NextViewController', () => defineNextViewController(UIExtension))
  register('UndoController', () => defineUndoController())
  register('RedoController', () => defineRedoController())
}
