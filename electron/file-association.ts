import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const PDF_PROG_ID = 'LitePDF.pdf'
export const APP_BUNDLE_ID = 'com.litepdf.app'
const PDF_UTI = 'com.adobe.pdf'
const CONTEXT_MENU_LABEL = '使用 LitePDF 打开'

export interface PdfAssociationStatus {
  packaged: boolean
  registered: boolean
  isDefault: boolean
  canSetDefault: boolean
  platform: NodeJS.Platform
  message: string
}

export interface SetDefaultPdfResult {
  ok: boolean
  isDefault: boolean
  openedSystemSettings: boolean
  message: string
}

function exePath() {
  return process.execPath
}

function openCommand() {
  return `"${exePath()}" "%1"`
}

async function runPowerShell(script: string) {
  await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, timeout: 15000 },
  )
}

async function readPowerShell(script: string) {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, timeout: 15000, encoding: 'utf8' },
  )
  return String(stdout || '').trim()
}

function psQuote(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

async function winSetReg(psPath: string, name: string, value: string) {
  const valueName = name === '(default)' ? '(default)' : name
  const script = `
    $p = ${psQuote(psPath)}
    if (-not (Test-Path -LiteralPath $p)) { New-Item -Path $p -Force | Out-Null }
    Set-ItemProperty -LiteralPath $p -Name ${psQuote(valueName)} -Value ${psQuote(value)} -Force
  `
  await runPowerShell(script)
}

async function winGetReg(psPath: string, name: string) {
  const valueName = name === '(default)' ? '(default)' : name
  const readExpr = valueName === '(default)' ? "$props.'(default)'" : `$props.${valueName}`
  const script = `
    $p = ${psQuote(psPath)}
    if (-not (Test-Path -LiteralPath $p)) { '' ; exit }
    try {
      $props = Get-ItemProperty -LiteralPath $p -ErrorAction Stop
      $v = ${readExpr}
      if ($null -eq $v) { '' } else { [string]$v }
    } catch { '' }
  `
  try {
    return await readPowerShell(script)
  } catch {
    return ''
  }
}

function normalizeFsPath(value: string) {
  return value.replace(/\//g, '\\').toLowerCase()
}

function commandPointsToLitePdf(command: string) {
  const text = normalizeFsPath(command)
  if (!text) return false
  if (text.includes('litepdf.exe')) return true
  const self = normalizeFsPath(exePath())
  return !!self && text.includes(self)
}

async function resolveProgIdOpenCommand(progId: string) {
  const id = String(progId || '').trim()
  if (!id) return ''
  const paths = [
    `HKCU:\\Software\\Classes\\${id}\\shell\\open\\command`,
    `HKLM:\\Software\\Classes\\${id}\\shell\\open\\command`,
  ]
  for (const path of paths) {
    const cmd = await winGetReg(path, '(default)')
    if (cmd) return cmd
  }
  return ''
}

async function isLitePdfProgId(progId: string) {
  const value = String(progId || '').trim()
  if (!value) return false
  const lower = value.toLowerCase()
  if (
    value === PDF_PROG_ID ||
    lower === 'applications\\litepdf.exe' ||
    lower === 'litepdf.pdf' ||
    lower.includes('litepdf')
  ) {
    return true
  }
  // electron-builder 的 fileAssociations.name 为 "PDF Document"，
  // Windows 设置默认应用时可能写入该 ProgId，需解析其打开命令是否指向本程序。
  const command = await resolveProgIdOpenCommand(value)
  return commandPointsToLitePdf(command)
}

async function notifyShellAssocChanged() {
  const script = `
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class LitePdfShell {
  [DllImport("shell32.dll")] public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
    [LitePdfShell]::SHChangeNotify(0x8000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
  `
  try {
    await runPowerShell(script)
  } catch {
    // 资源管理器稍后也会自行刷新关联
  }
}

/** 注册「打开方式」与右键「使用 LitePDF 打开」，并出现在系统默认应用列表 */
export async function registerPdfFileAssociation(): Promise<void> {
  if (!app.isPackaged) return
  if (process.platform === 'win32') {
    await registerWindowsAssociation()
    return
  }
  // macOS：安装包 Info.plist 的 CFBundleDocumentTypes 即完成「打开方式」注册
}

async function registerWindowsAssociation() {
  const exe = exePath()
  const cmd = openCommand()
  // electron-builder fileAssociations.name = "PDF Document"，系统设置默认应用常写入该 ProgId
  const builderProgId = 'PDF Document'

  await Promise.all([
    winSetReg(`HKCU:\\Software\\Classes\\${PDF_PROG_ID}`, '(default)', 'PDF 文档'),
    winSetReg(`HKCU:\\Software\\Classes\\${PDF_PROG_ID}`, 'FriendlyTypeName', 'PDF 文档'),
    winSetReg(`HKCU:\\Software\\Classes\\${PDF_PROG_ID}\\DefaultIcon`, '(default)', `${exe},0`),
    winSetReg(`HKCU:\\Software\\Classes\\${PDF_PROG_ID}\\shell\\open`, '(default)', '打开'),
    winSetReg(`HKCU:\\Software\\Classes\\${PDF_PROG_ID}\\shell\\open\\command`, '(default)', cmd),
    winSetReg(`HKCU:\\Software\\Classes\\${builderProgId}`, '(default)', 'PDF 文档'),
    winSetReg(`HKCU:\\Software\\Classes\\${builderProgId}`, 'FriendlyTypeName', 'PDF 文档'),
    winSetReg(`HKCU:\\Software\\Classes\\${builderProgId}\\DefaultIcon`, '(default)', `${exe},0`),
    winSetReg(`HKCU:\\Software\\Classes\\${builderProgId}\\shell\\open`, '(default)', '打开'),
    winSetReg(`HKCU:\\Software\\Classes\\${builderProgId}\\shell\\open\\command`, '(default)', cmd),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\OpenWithProgids', PDF_PROG_ID, ''),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\OpenWithProgids', builderProgId, ''),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\shell\\LitePDF', '(default)', CONTEXT_MENU_LABEL),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\shell\\LitePDF', 'MUIVerb', CONTEXT_MENU_LABEL),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\shell\\LitePDF', 'Icon', `${exe},0`),
    winSetReg('HKCU:\\Software\\Classes\\.pdf\\shell\\LitePDF\\command', '(default)', cmd),
    winSetReg('HKCU:\\Software\\Classes\\Applications\\LitePDF.exe', 'FriendlyAppName', 'LitePDF'),
    winSetReg('HKCU:\\Software\\Classes\\Applications\\LitePDF.exe\\SupportedTypes', '.pdf', ''),
    winSetReg('HKCU:\\Software\\Classes\\Applications\\LitePDF.exe\\shell\\open\\command', '(default)', cmd),
    winSetReg(
      'HKCU:\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\LitePDF',
      '(default)',
      CONTEXT_MENU_LABEL,
    ),
    winSetReg(
      'HKCU:\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\LitePDF',
      'MUIVerb',
      CONTEXT_MENU_LABEL,
    ),
    winSetReg(
      'HKCU:\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\LitePDF',
      'Icon',
      `${exe},0`,
    ),
    winSetReg(
      'HKCU:\\Software\\Classes\\SystemFileAssociations\\.pdf\\shell\\LitePDF\\command',
      '(default)',
      cmd,
    ),
    winSetReg('HKCU:\\Software\\LitePDF\\Capabilities', 'ApplicationName', 'LitePDF'),
    winSetReg(
      'HKCU:\\Software\\LitePDF\\Capabilities',
      'ApplicationDescription',
      '轻量、专注的多标签 PDF 阅读器',
    ),
    winSetReg('HKCU:\\Software\\LitePDF\\Capabilities\\FileAssociations', '.pdf', PDF_PROG_ID),
    winSetReg('HKCU:\\Software\\RegisteredApplications', 'LitePDF', 'Software\\LitePDF\\Capabilities'),
  ])

  await notifyShellAssocChanged()
}

async function isWindowsDefaultHandler() {
  // Windows 11 优先 UserChoiceLatest；旧路径 UserChoice 可能仍是历史值（如 MSEdgePDF）
  const candidates = [
    await winGetReg(
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.pdf\\UserChoiceLatest\\ProgId',
      'ProgId',
    ),
    await winGetReg(
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.pdf\\UserChoice',
      'ProgId',
    ),
    await winGetReg('HKCU:\\Software\\Classes\\.pdf', '(default)'),
  ]

  for (const raw of candidates) {
    if (await isLitePdfProgId(raw)) return true
  }
  return false
}

async function isWindowsRegistered() {
  const cmd = await winGetReg(
    `HKCU:\\Software\\Classes\\${PDF_PROG_ID}\\shell\\open\\command`,
    '(default)',
  )
  return cmd.toLowerCase().includes('litepdf.exe')
}

async function runOsascriptJs(source: string) {
  const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', source], {
    timeout: 8000,
    encoding: 'utf8',
  })
  return String(stdout || '').trim()
}

async function macDefaultHandlerId() {
  const source = `
    ObjC.import('CoreServices');
    var id = $.LSCopyDefaultRoleHandlerForContentType($(${JSON.stringify(PDF_UTI)}), $.kLSRolesAll);
    id ? ObjC.unwrap(id) : '';
  `
  try {
    return await runOsascriptJs(source)
  } catch {
    return ''
  }
}

async function macSetDefaultHandler() {
  const source = `
    ObjC.import('CoreServices');
    $.LSSetDefaultRoleHandlerForContentType(
      $(${JSON.stringify(PDF_UTI)}),
      $.kLSRolesAll,
      $(${JSON.stringify(APP_BUNDLE_ID)})
    );
  `
  await runOsascriptJs(source)
}

export async function getPdfAssociationStatus(): Promise<PdfAssociationStatus> {
  const packaged = app.isPackaged
  const platform = process.platform

  if (!packaged) {
    return {
      packaged,
      registered: false,
      isDefault: false,
      canSetDefault: false,
      platform,
      message: '开发模式不会注册系统文件关联，请使用安装包验证右键打开与默认应用。',
    }
  }

  if (platform === 'win32') {
    const registered = await isWindowsRegistered()
    const isDefault = await isWindowsDefaultHandler()
    let message = '尚未注册为 PDF 打开方式。'
    if (isDefault) message = 'LitePDF 已是本机 PDF 的默认应用。'
    else if (registered) message = '已加入右键「使用 LitePDF 打开」。可将 LitePDF 设为默认 PDF 应用。'
    return {
      packaged,
      registered,
      isDefault,
      canSetDefault: !isDefault,
      platform,
      message,
    }
  }

  if (platform === 'darwin') {
    const handler = await macDefaultHandlerId()
    const isDefault = handler === APP_BUNDLE_ID
    return {
      packaged,
      registered: true,
      isDefault,
      canSetDefault: !isDefault,
      platform,
      message: isDefault
        ? 'LitePDF 已是本机 PDF 的默认应用。'
        : '已出现在「打开方式」中。点击按钮可将 LitePDF 设为默认 PDF 应用。',
    }
  }

  return {
    packaged,
    registered: false,
    isDefault: false,
    canSetDefault: false,
    platform,
    message: '当前系统暂不支持在应用内设置 PDF 默认程序。',
  }
}

async function openWindowsDefaultAppsSettings() {
  // Windows 不允许程序静默抢占默认应用；尽量打开「按文件类型选择默认应用」页面
  const uris = [
    'ms-settings:defaultapps?fileExtension=.pdf',
    'ms-settings:defaultapps?registeredAppUser=LitePDF',
    'ms-settings:defaultapps',
    'ms-settings:default-programs',
  ]
  for (const uri of uris) {
    try {
      await shell.openExternal(uri)
      return true
    } catch {
      // try next
    }
  }
  return false
}

export async function setAsDefaultPdfHandler(): Promise<SetDefaultPdfResult> {
  if (!app.isPackaged) {
    return {
      ok: false,
      isDefault: false,
      openedSystemSettings: false,
      message: '请安装 LitePDF 后再设置为默认 PDF 应用。',
    }
  }

  try {
    await registerPdfFileAssociation()
  } catch (error) {
    return {
      ok: false,
      isDefault: false,
      openedSystemSettings: false,
      message: error instanceof Error ? error.message : '注册文件关联失败',
    }
  }

  if (process.platform === 'darwin') {
    try {
      await macSetDefaultHandler()
    } catch {
      return {
        ok: false,
        isDefault: false,
        openedSystemSettings: false,
        message:
          '无法自动修改默认应用。请在访达中选中 PDF → 显示简介 → 打开方式选择 LitePDF → 全部更改。',
      }
    }
    const handler = await macDefaultHandlerId()
    const isDefault = handler === APP_BUNDLE_ID
    return {
      ok: isDefault,
      isDefault,
      openedSystemSettings: false,
      message: isDefault
        ? '已将 LitePDF 设为默认 PDF 应用。'
        : '系统未接受自动设置。请在访达「显示简介」中将打开方式改为 LitePDF，并点击「全部更改」。',
    }
  }

  if (process.platform === 'win32') {
    const isDefault = await isWindowsDefaultHandler()
    if (isDefault) {
      return {
        ok: true,
        isDefault: true,
        openedSystemSettings: false,
        message: 'LitePDF 已是本机 PDF 的默认应用。',
      }
    }
    const openedSystemSettings = await openWindowsDefaultAppsSettings()
    return {
      ok: true,
      isDefault: false,
      openedSystemSettings,
      message: openedSystemSettings
        ? '已打开系统设置。请在「默认应用」中搜索 PDF 或 LitePDF，将 .pdf 明确指定为 LitePDF。完成后回到本应用，按钮会自动变为「已是默认」。'
        : '已注册右键「使用 LitePDF 打开」。请打开「设置 → 应用 → 默认应用」，将 PDF 指定为 LitePDF。完成后回到本应用再查看按钮状态。',
    }
  }

  return {
    ok: false,
    isDefault: false,
    openedSystemSettings: false,
    message: '当前系统暂不支持在应用内设置 PDF 默认程序。',
  }
}
