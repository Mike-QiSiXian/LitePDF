/**
 * 以 UTF-8 控制台运行子命令（Windows 开发态中文日志不乱码）。
 * 用法: node scripts/run-with-utf8.mjs <command> [args...]
 */
import { spawn } from 'node:child_process'
import { ensureWindowsUtf8Console } from './ensure-windows-utf8.mjs'

ensureWindowsUtf8Console()

const argv = process.argv.slice(2)
if (!argv.length) {
  console.error('用法: node scripts/run-with-utf8.mjs <command> [args...]')
  process.exit(1)
}

/** Windows + shell 时用整行命令，避免 DEP0190（args 不转义） */
function quoteArg(arg) {
  if (!/[ \t"]/u.test(arg)) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

const commandLine = argv.map(quoteArg).join(' ')
const child = spawn(commandLine, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
  },
  windowsHide: false,
})

child.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
