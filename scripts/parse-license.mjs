/**
 * 解析 Foxit license-key.js，兼容官方两种写法：
 * - var licenseSN = "..."
 * - licenseSN: "..." / return { licenseSN: "..." }
 */
export function parseLicenseScript(text) {
  const sn = text.match(/licenseSN\s*[:=]\s*"([^"]+)"/)?.[1]
  const key = text.match(/licenseKey\s*[:=]\s*"([^"]+)"/)?.[1]
  if (!sn || !key) return null
  return { licenseSN: sn, licenseKey: key }
}
