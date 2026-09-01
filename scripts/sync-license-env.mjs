import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './ensure-windows-utf8.mjs'
import { parseLicenseScript } from './parse-license.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const licensePath = path.join(root, 'public', 'license-key.js')
const envPath = path.join(root, '.env')

if (!fs.existsSync(licensePath)) {
  console.error('找不到 public/license-key.js')
  process.exit(1)
}

const parsed = parseLicenseScript(fs.readFileSync(licensePath, 'utf8'))
if (!parsed) {
  console.error('无法从 license-key.js 解析 licenseSN / licenseKey')
  console.error('支持格式：var licenseSN = "..." 或 licenseSN: "..."')
  process.exit(1)
}

fs.writeFileSync(
  envPath,
  `VITE_FOXIT_LICENSE_SN=${parsed.licenseSN}\nVITE_FOXIT_LICENSE_KEY=${parsed.licenseKey}\n`,
  'utf8',
)
console.log('已同步 .env <- public/license-key.js')
console.log('SN 前缀:', parsed.licenseSN.slice(0, 16))
