/**
 * 顶栏「更多」下拉菜单项 Controller
 */

import { t } from '@/i18n'

function notify(message: string) {
  try {
    window.alert(message)
  } catch {
    // ignore
  }
}

function closeParentMenu(component: any) {
  try {
    let p = component?.parent
    while (p) {
      if (typeof p.hide === 'function' && p.name === 'litepdf-more-menu') {
        p.hide()
        break
      }
      p = p.parent
    }
  } catch {
    // ignore
  }
}

async function startPresentation(pdfui: any, fullscreenTrigger: any) {
  if (!fullscreenTrigger) throw new Error('官方全屏组件尚未就绪')

  // 先在用户点击上下文中触发官方 Controller，确保 Electron 接受全屏请求。
  fullscreenTrigger.trigger?.('click')
  const viewModeManager = await pdfui.getViewModeManager()
  await viewModeManager.switchTo('single-page-view-mode')
  await pdfui.zoomTo('fitHeight')
}

/** 对齐官方 fpmodule:FileInfoCallbackController */
async function openDocumentProperties(ctx: any) {
  const pdfui = ctx.getPDFUI?.()
  if (!pdfui?.__litepdfFilePath) {
    notify(t('reader.openFirst'))
    return
  }

  const doc = await pdfui.getCurrentPDFDoc()
  if (!doc) {
    notify(t('reader.cannotOpenProperties'))
    return
  }
  await doc.getMetadata()

  let popup = await getComp(ctx, 'file-property-popup')
  if (!popup?.show && typeof pdfui.openDialog === 'function') {
    popup = await Promise.resolve(pdfui.openDialog('file-property-popup'))
  }
  if (!popup?.show) {
    notify(t('reader.cannotOpenProperties'))
    return
  }
  popup.show()
}

/** Controller 内 getComponentByName 可能同步返回组件，也可能返回 Promise */
async function getComp(ctx: any, name: string) {
  try {
    return await Promise.resolve(ctx.getComponentByName(name))
  } catch {
    return null
  }
}

export function defineMoreMenuController() {
  return {
    mounted(this: any) {
      if (this.component?.getAttribute?.('action') !== 'play') return
      void getComp(this, 'litepdf-presentation-fullscreen-trigger').then(
        (component: any) => {
          this.presentationFullscreenTrigger = component
        },
      )
    },

    async handle(this: any) {
      const action = this.component?.getAttribute?.('action') || ''
      closeParentMenu(this.component)

      switch (action) {
        case 'open-browser': {
          const pdfui = this.getPDFUI?.()
          const filePath = pdfui?.__litepdfFilePath as string | undefined
          if (filePath && window.litepdf?.openPath) {
            await window.litepdf.openPath(filePath)
          } else if (filePath) {
            // 浏览器调试：用 file URL 尝试打开
            window.open(`file:///${filePath.replace(/\\/g, '/')}`, '_blank')
          } else {
            notify(t('reader.openFirst'))
          }
          break
        }
        case 'send-devices':
          notify(t('reader.sendDevicesSoon'))
          break
        case 'password':
          notify(t('reader.passwordSoon'))
          break
        case 'annotations': {
          try {
            const commentTab = await getComp(this, 'comment-tab')
            commentTab?.trigger?.('click')
            commentTab?.active?.()
            const sidebar = await getComp(this, 'sidebar')
            sidebar?.expand?.()
            const panel = await getComp(this, 'comment-list-sidebar-panel')
            await panel?.active?.()
          } catch {
            notify(t('reader.cannotOpenAnnotations'))
          }
          break
        }
        case 'properties': {
          try {
            await openDocumentProperties(this)
          } catch {
            notify(t('reader.cannotOpenProperties'))
          }
          break
        }
        case 'play': {
          const pdfui = this.getPDFUI?.()
          if (!pdfui?.__litepdfFilePath) {
            notify(t('reader.openFirst'))
            break
          }
          try {
            const fullscreenTrigger =
              this.presentationFullscreenTrigger ||
              (await getComp(this, 'litepdf-presentation-fullscreen-trigger'))
            await startPresentation(pdfui, fullscreenTrigger)
          } catch {
            notify(t('reader.cannotEnterPresentation'))
          }
          break
        }
        default:
          break
      }
    },
  }
}
