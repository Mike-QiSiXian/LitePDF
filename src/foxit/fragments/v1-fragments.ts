/**

 * V1 fragments：布局内业务入口已尽量用 @controller 复用 SDK / 自研 Controller。

 * 此处保留扩展点，供后续无 Controller 的裁剪逻辑使用。

 */

export function createV1Fragments(_UIExtension: any) {

  return [] as Array<Record<string, unknown>>

}



/** RibbonAppearance 模式下的裁剪（备用） */

export function ribbonTrimFragments(UIExtension: any) {

  const ACTION = UIExtension.UIConsts.FRAGMENT_ACTION

  return ['edit-tab', 'form-tab', 'protect-tab', 'portfolio-tab'].map((target) => ({

    target,

    action: ACTION.REMOVE,

  }))

}


