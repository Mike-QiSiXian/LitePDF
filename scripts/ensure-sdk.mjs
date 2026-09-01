import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './ensure-windows-utf8.mjs'
import { parseLicenseScript } from './parse-license.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const target = path.join(root, 'public', 'foxit-lib')
const npmLib = path.join(
  root,
  'node_modules',
  '@foxitsoftware',
  'foxit-pdf-sdk-for-web-library',
  'lib',
)
const studyLib = 'C:\\WorkSpaceForOpenCode\\FoxitWebSDKStudy\\sdk\\lib'

function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}

function resolveLibSource() {
  if (process.env.FOXIT_SDK_LIB) return process.env.FOXIT_SDK_LIB
  if (exists(path.join(npmLib, 'UIExtension.full.js'))) return npmLib
  if (exists(studyLib)) return studyLib
  return null
}

function ensureLinked(from, to, label) {
  if (exists(to)) {
    if (isLink(to)) {
      try {
        if (path.resolve(fs.realpathSync(to)) === path.resolve(from)) {
          console.log(`[ensure-sdk] ${label} 已就绪: ${to}`)
          return true
        }
      } catch {
        // 失效链接，下面重建
      }
      fs.unlinkSync(to)
    } else if (exists(path.join(to, 'UIExtension.full.js'))) {
      console.log(`[ensure-sdk] ${label} 已存在本地目录，跳过: ${to}`)
      return true
    } else {
      fs.rmSync(to, { recursive: true, force: true })
    }
  }
  if (!exists(from)) {
    console.warn(`[ensure-sdk] 跳过 ${label}，源不存在: ${from}`)
    return false
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  try {
    fs.symlinkSync(from, to, process.platform === 'win32' ? 'junction' : 'dir')
    console.log(`[ensure-sdk] 已创建 ${label} 链接: ${to} -> ${from}`)
    return true
  } catch (err) {
    console.warn(`[ensure-sdk] ${label} 链接失败，尝试复制…`, err.message)
    fs.cpSync(from, to, { recursive: true })
    console.log(`[ensure-sdk] 已复制 ${label} 到 ${to}`)
    return true
  }
}

const source = resolveLibSource()
if (!source || !exists(source)) {
  console.error('[ensure-sdk] 找不到 Foxit WebSDK lib')
  console.error('请先执行: npm install @foxitsoftware/foxit-pdf-sdk-for-web-library')
  console.error('或设置 FOXIT_SDK_LIB 指向本地 lib 目录')
  process.exit(1)
}

console.log(`[ensure-sdk] 使用 lib: ${source}`)
ensureLinked(source, target, 'foxit-lib')
console.log('[ensure-sdk] 字体使用官方 webfonts + Local Font Access，不准备 foxit-external')

const licenseCandidates = [
  path.join(root, 'public', 'license-key.js'),
  path.join(path.dirname(source), 'examples', 'license-key.js'),
  path.join(path.dirname(path.dirname(source)), 'examples', 'license-key.js'),
]
const licenseDest = path.join(root, 'public', 'license-key.js')
const envDest = path.join(root, '.env')
const licenseSrc = licenseCandidates.find((p) => p !== licenseDest && exists(p))
const licenseTextSource = exists(licenseDest) ? licenseDest : licenseSrc || null

if (!exists(licenseDest) && licenseSrc) {
  fs.copyFileSync(licenseSrc, licenseDest)
  console.log(`[ensure-sdk] 已复制 license-key.js -> ${licenseDest}`)
}

if (licenseTextSource) {
  const text = fs.readFileSync(licenseTextSource, 'utf8')
  const parsed = parseLicenseScript(text)
  if (parsed) {
    fs.writeFileSync(
      envDest,
      `VITE_FOXIT_LICENSE_SN=${parsed.licenseSN}\nVITE_FOXIT_LICENSE_KEY=${parsed.licenseKey}\n`,
      'utf8',
    )
    console.log('[ensure-sdk] 已根据 license-key.js 同步 .env（请勿提交）')
  } else {
    console.warn('[ensure-sdk] 无法解析 license-key.js，请检查 SN/Key 格式')
  }
} else {
  console.warn('[ensure-sdk] 未找到 license-key.js，请自行放到 public/ 或配置 .env')
}
