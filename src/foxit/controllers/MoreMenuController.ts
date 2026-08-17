/**
 * 顶栏「更多」下拉菜单项 Controller
 */

function notify(message: string) {
  try {
    window.alert(message)
  } catch {
    // ignore
  }
}

async function closeParentDropdown(component: any) {
  try {
    let p = component?.parent
    while (p) {
      if (typeof p.hide === 'function' && p.name === 'litepdf-more') {
        p.hide()
        break
      }
      if (typeof p.collapse === 'function' && p.isDropdown) {
        p.collapse()
        break
      }
      // 向上找到 more dropdown
      if (p.name === 'litepdf-more' && typeof p.trigger === 'function') {
        p.trigger?.('click')
        break
      }
      p = p.parent
    }
  } catch {
    // ignore
  }
}

export function defineMoreMenuController() {
  return {
    async handle(this: any) {
      const action = this.component?.getAttribute?.('action') || ''
      await closeParentDropdown(this.component)

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
            notify('请先打开 PDF 文件')
          }
          break
        }
        case 'send-devices':
          notify('「发送到其他设备」即将支持')
          break
        case 'password':
          notify('「文档密码」即将支持')
          break
        case 'annotations': {
          try {
            const commentTab = await this.getComponentByName('comment-tab')
            commentTab?.trigger?.('click')
            commentTab?.active?.()
            const sidebar = await this.getComponentByName('sidebar')
            sidebar?.expand?.()
            const panel = await this.getComponentByName('comment-list-sidebar-panel')
            await panel?.active?.()
          } catch {
            notify('无法打开注解面板')
          }
          break
        }
        case 'play':
          notify('「播放」即将支持')
          break
        case 'properties':
          notify('「文档属性」即将支持')
          break
        case 'settings':
          notify('「PDF 设置」即将支持')
          break
        default:
          break
      }
    },
  }
}
