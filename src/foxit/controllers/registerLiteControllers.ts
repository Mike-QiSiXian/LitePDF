import { ensureMoreMenuIconStyles } from '../assets/more-menu-icons'
import { ensureSidebarToggleIconStyles } from '../assets/sidebar-icons'
import { defineMoreMenuController } from './MoreMenuController'
import { defineSidebarToggleController } from './SidebarToggleController'

/**
 * 统一注册 litepdf 模块下所有自研 Controller（幂等）。
 * 已存在的模块上仍可继续挂新 Controller，避免 HMR/多标签只注册到一半。
 */
export function registerLiteControllers(UIExtension: any) {
  ensureSidebarToggleIconStyles()
  ensureMoreMenuIconStyles()

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

  if (!bag.has('SidebarToggleController')) {
    try {
      mod.controller('SidebarToggleController', defineSidebarToggleController(UIExtension))
    } catch {
      // 已注册
    }
    bag.add('SidebarToggleController')
  }

  if (!bag.has('MoreMenuController')) {
    try {
      mod.controller('MoreMenuController', defineMoreMenuController())
    } catch {
      // 已注册
    }
    bag.add('MoreMenuController')
  }
}
