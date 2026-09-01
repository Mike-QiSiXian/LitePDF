/**
 * Windows 控制台默认多为 GBK (936)，Node/Electron 输出 UTF-8 时中文会乱码。
 * 在启动脚本里把当前控制台切到 UTF-8 (65001)。
 */
import { execSync } from 'node:child_process'

export function ensureWindowsUtf8Console() {
  if (process.platform !== 'win32') return

  try {
    // 必须整句交给 shell，才能正确执行 chcp 与重定向
    execSync('chcp 65001 >NUL', {
      stdio: 'ignore',
      windowsHide: true,
      shell: true,
    })
  } catch {
    // 非交互或无控制台时忽略
  }

  process.env.PYTHONUTF8 = '1'
  process.env.PYTHONIOENCODING = 'utf-8'

  try {
    if (process.stdout?.setDefaultEncoding) {
      process.stdout.setDefaultEncoding('utf8')
    }
    if (process.stderr?.setDefaultEncoding) {
      process.stderr.setDefaultEncoding('utf8')
    }
  } catch {
    // ignore
  }
}

ensureWindowsUtf8Console()
