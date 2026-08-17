import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const target = path.join(root, 'public', 'foxit-lib')
const source =
  process.env.FOXIT_SDK_LIB ||
  'C:\\WorkSpaceForOpenCode\\FoxitWebSDKStudy\\sdk\\lib'
const externalTarget = path.join(root, 'public', 'foxit-external')
const externalSource = path.join(path.dirname(source), 'external')

function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function ensureJunction(from, to, label) {
  if (exists(to)) {
    console.log(`[ensure-sdk] ${label} 已就绪: ${to}`)
    return
  }
  if (!exists(from)) {
    console.warn(`[ensure-sdk] 跳过 ${label}，源不存在: ${from}`)
    return
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  try {
    fs.symlinkSync(from, to, 'junction')
    console.log(`[ensure-sdk] 已创建 ${label} junction: ${to} -> ${from}`)
  } catch (err) {
    console.warn(`[ensure-sdk] ${label} junction 失败，尝试复制…`, err.message)
    fs.cpSync(from, to, { recursive: true })
    console.log(`[ensure-sdk] 已复制 ${label} 到 ${to}`)
  }
}

if (!exists(source)) {
  console.error(`[ensure-sdk] 找不到 SDK lib: ${source}`)
  console.error('请设置环境变量 FOXIT_SDK_LIB 指向 Foxit WebSDK 的 lib 目录')
  process.exit(1)
}

ensureJunction(source, target, 'foxit-lib')
ensureJunction(externalSource, externalTarget, 'foxit-external')

const licenseSrc = path.join(path.dirname(source), 'examples', 'license-key.js')
const licenseDest = path.join(root, 'public', 'license-key.js')
const envDest = path.join(root, '.env')
// 优先保留开发者已放在 public/license-key.js 的最新授权；仅在缺失时从学习仓复制
const licenseTextSource = exists(licenseDest)
  ? licenseDest
  : exists(licenseSrc)
    ? licenseSrc
    : null

if (!exists(licenseDest) && exists(licenseSrc)) {
  fs.copyFileSync(licenseSrc, licenseDest)
  console.log(`[ensure-sdk] 已复制 license-key.js -> ${licenseDest}`)
}

if (licenseTextSource) {
  const text = fs.readFileSync(licenseTextSource, 'utf8')
  const sn = text.match(/licenseSN\s*:\s*"([^"]+)"/)?.[1]
  const key = text.match(/licenseKey\s*:\s*"([^"]+)"/)?.[1]
  if (sn && key) {
    // 始终用当前 license-key.js 同步 .env，避免旧 .env 覆盖新授权
    fs.writeFileSync(
      envDest,
      `VITE_FOXIT_LICENSE_SN=${sn}\nVITE_FOXIT_LICENSE_KEY=${key}\n`,
      'utf8',
    )
    console.log('[ensure-sdk] 已根据 license-key.js 同步 .env（请勿提交）')
  }
} else {
  console.warn('[ensure-sdk] 未找到 license-key.js，请自行放到 public/ 或配置 .env')
}
