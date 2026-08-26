import defaults from './license.defaults.json'

export type LicensePair = {
  licenseSN: string
  licenseKey: string
}

function parseLicenseScript(text: string): LicensePair | null {
  // 兼容 var licenseSN = "..." 与 licenseSN: "..." 两种官方写法
  const sn = text.match(/licenseSN\s*[:=]\s*"([^"]+)"/)?.[1]
  const key = text.match(/licenseKey\s*[:=]\s*"([^"]+)"/)?.[1]
  if (!sn || !key) return null
  return { licenseSN: sn, licenseKey: key }
}

/**
 * 授权读取优先级：
 * 1. public/license-key.js（运行时，方便直接替换该文件）
 * 2. .env 中的 VITE_FOXIT_LICENSE_*
 * 3. license.defaults.json
 */
export async function getLicense(): Promise<LicensePair> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}license-key.js`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const parsed = parseLicenseScript(await res.text())
      if (parsed) return parsed
    }
  } catch {
    // 忽略，继续回退
  }

  const licenseSN = import.meta.env.VITE_FOXIT_LICENSE_SN || defaults.licenseSN
  const licenseKey = import.meta.env.VITE_FOXIT_LICENSE_KEY || defaults.licenseKey

  if (!licenseSN || !licenseKey) {
    throw new Error(
      '缺少 Foxit License。请更新 public/license-key.js，或在 .env 中配置 VITE_FOXIT_LICENSE_SN / VITE_FOXIT_LICENSE_KEY。',
    )
  }

  return { licenseSN, licenseKey }
}
