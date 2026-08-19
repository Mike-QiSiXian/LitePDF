import { HIGHLIGHT_ICON_CLS } from '../assets/highlight-icons'
import { INKSIGN_ICON_CLS } from '../assets/inksign-icons'

/**
 * V1 fragments。
 * 替换内置按钮图标：官方方式是 target + config.iconCls。
 * @see examples/UIExtension/fragment_usage/replace-buttons-icon.html
 */
export function createV1Fragments(_UIExtension: any) {
  return [
    {
      target: 'create-highlight',
      config: {
        iconCls: HIGHLIGHT_ICON_CLS,
      },
    },
    {
      target: 'fv--ink-sign-dropdown',
      config: {
        iconCls: INKSIGN_ICON_CLS,
      },
    },
  ] as Array<Record<string, unknown>>
}

/** RibbonAppearance 模式下的裁剪（备用） */
export function ribbonTrimFragments(UIExtension: any) {
  const ACTION = UIExtension.UIConsts.FRAGMENT_ACTION
  return ['edit-tab', 'form-tab', 'protect-tab', 'portfolio-tab'].map((target) => ({
    target,
    action: ACTION.REMOVE,
  }))
}
