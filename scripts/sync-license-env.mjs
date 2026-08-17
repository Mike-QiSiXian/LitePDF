import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const licensePath = path.join(root, 'public', 'license-key.js')
const envPath = path.join(root, '.env')

if (!fs.existsSync(licensePath)) {
  console.error('找不到 public/license-key.js')
  process.exit(1)
}

const text = fs.readFileSync(licensePath, 'utf8')
const sn = text.match(/licenseSN\s*:\s*"([^"]+)"/)?.[1]
const key = text.match(/licenseKey\s*:\s*"([^"]+)"/)?.[1]
if (!sn || !key) {
  console.error('无法从 license-key.js 解析 licenseSN / licenseKey')
  process.exit(1)
}

fs.writeFileSync(envPath, `VITE_FOXIT_LICENSE_SN=${sn}\nVITE_FOXIT_LICENSE_KEY=${key}\n`, 'utf8')
console.log('已同步 .env <- public/license-key.js')
console.log('SN 前缀:', sn.slice(0, 16))
