/** 引擎/SDK 常把内部错误码当成 message，例如授权无效时的 -3 */

export function isRawEngineErrorCode(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true
  const text = String(value ?? '').trim()
  return /^-?\d+$/.test(text)
}

/**
 * 应用层遮罩展示用文案。
 * 纯错误码不展示：WebSDK 已弹出「授权无效」等对话框，再叠一层会挡住并露出 -3。
 */
export function toUserFacingErrorMessage(value: unknown): string {
  if (value == null || isRawEngineErrorCode(value)) return ''

  const message =
    value instanceof Error
      ? value.message
      : typeof value === 'object'
        ? String(
            (value as Record<string, unknown>).message ??
              (value as Record<string, unknown>).error ??
              '',
          )
        : String(value)

  if (!message.trim() || message === 'null' || message === 'undefined' || isRawEngineErrorCode(message)) {
    return ''
  }
  return message.trim()
}
