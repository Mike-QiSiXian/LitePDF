/**
 * 按版本号更新 README 顶部的下载链接。
 * 链接规则固定，安装包上传到对应 Release 后即可访问。
 *
 * 用法：
 *   node scripts/update-readme-release.mjs              # 使用 package.json 的版本，并去掉失败标注
 *   node scripts/update-readme-release.mjs 0.1.13
 *   node scripts/update-readme-release.mjs --failed     # 保留链接，并标明这次打包失败
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const failed = args.includes('--failed')
const versionArg = args.find((arg) => !arg.startsWith('--'))
let version = (versionArg || '').replace(/^v/i, '')
if (!version) {
  version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
}
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('版本号无效，例如 0.1.13')
  process.exit(1)
}

const readmePath = path.join(root, 'README.md')
const repo = 'https://github.com/Mike-QiSiXian/LitePDF'
const base = `${repo}/releases/download/v${version}`
const failedBlock = [
  '<!-- pack-failed -->',
  '> **安装包尚未就绪**：自动打包失败，上表下载链接暂时无效。修复后再次提交会重新打包，也可以在 Actions 里重试 pack。',
  '<!-- /pack-failed -->',
].join('\n')

const original = fs.readFileSync(readmePath, 'utf8')
const newline = original.includes('\r\n') ? '\r\n' : '\n'
let text = original.replace(/\r\n/g, '\n')
text = text.replace(/\n<!-- pack-failed -->[\s\S]*?<!-- \/pack-failed -->\n/g, '\n')

text = text.replace(/\[最新版本 v[\d.]+\]/g, `[最新版本 v${version}]`)
text = text.replace(/当前最新正式版：\*\*v[\d.]+\*\*/g, `当前最新正式版：**v${version}**`)
text = text.replace(
  /\[LitePDF-Setup-[\d.]+\.exe\]\([^)]+\)/g,
  `[LitePDF-Setup-${version}.exe](${base}/LitePDF-Setup-${version}.exe)`,
)
text = text.replace(
  /\[LitePDF-[\d.]+-arm64\.dmg\]\([^)]+\)/g,
  `[LitePDF-${version}-arm64.dmg](${base}/LitePDF-${version}-arm64.dmg)`,
)
text = text.replace(
  /\[LitePDF-[\d.]+-x64\.dmg\]\([^)]+\)/g,
  `[LitePDF-${version}-x64.dmg](${base}/LitePDF-${version}-x64.dmg)`,
)

if (failed && !text.includes('当前最新正式版：')) {
  console.error('README 中找不到「当前最新正式版」')
  process.exit(1)
}
if (failed) {
  text = text.replace(
    /(当前最新正式版：\*\*v[\d.]+\*\*\n)/,
    `$1${failedBlock}\n`,
  )
}

const next = newline === '\r\n' ? text.replace(/\n/g, '\r\n') : text
if (next === original) {
  console.log(failed ? `README 已标明 v${version} 打包失败` : `README 下载链接已是 v${version}`)
} else {
  fs.writeFileSync(readmePath, next)
  console.log(failed ? `README 已标明 v${version} 打包失败` : `README 已指向 v${version}`)
}
