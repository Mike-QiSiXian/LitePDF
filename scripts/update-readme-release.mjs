/**
 * 把 README 顶部的最新版本号和三平台下载链接改成指定版本。
 * 若「当前版本」里还没有该版本小节，用环境变量 LITEPDF_CHANGELOG 补上。
 *
 * 用法：node scripts/update-readme-release.mjs 0.1.13
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const version = (process.argv[2] || '').replace(/^v/i, '')
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('请传入版本号，例如 0.1.13')
  process.exit(1)
}

const readmePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'README.md')
const repo = 'https://github.com/Mike-QiSiXian/LitePDF'
const base = `${repo}/releases/download/v${version}`
const original = fs.readFileSync(readmePath, 'utf8')
const newline = original.includes('\r\n') ? '\r\n' : '\n'
let text = original.replace(/\r\n/g, '\n')

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
text = text.replace(/Apple 芯片（[^）]*）/g, 'Apple 芯片')
text = text.replace(/Intel（[^）]*）/g, 'Intel')

const heading = `### v${version}\n`
if (!text.includes(heading)) {
  const notes = (process.env.LITEPDF_CHANGELOG || `- 发布 v${version}`).trim()
  const block = `${heading}\n${notes}\n\n`
  const marker = '## 当前版本\n'
  if (!text.includes(marker)) {
    console.error('README 中找不到「## 当前版本」')
    process.exit(1)
  }
  text = text.replace(marker, `${marker}\n${block}`)
}

if (newline === '\r\n') text = text.replace(/\n/g, '\r\n')
fs.writeFileSync(readmePath, text)
console.log(`README 已指向 v${version}`)
