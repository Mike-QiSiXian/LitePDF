/**
 * 从环境变量写入 public/license-key.js，供 CI 打包使用。
 * 不打印授权内容。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sn = process.env.FOXIT_LICENSE_SN || ''
const key = process.env.FOXIT_LICENSE_KEY || ''
if (!sn || !key) {
  console.error('缺少环境变量 FOXIT_LICENSE_SN 或 FOXIT_LICENSE_KEY')
  process.exit(1)
}

function escapeJsString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'license-key.js')
fs.writeFileSync(
  dest,
  `var licenseSN = "${escapeJsString(sn)}"\nvar licenseKey = "${escapeJsString(key)}"\n`,
  'utf8',
)
console.log('已写入 public/license-key.js')
