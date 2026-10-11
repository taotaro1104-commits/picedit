// エラーはコード（＋パラメータ）で持ち、表示時に現在の言語へ翻訳する。
import type { Messages } from '../i18n/messages/ja'

export type ErrorParams = Readonly<Record<string, string | number | undefined>>
export type ErrorCode = Exclude<keyof Messages['errors'], 'http'> | 'http'

export class AppError extends Error {
  readonly code: string
  readonly params: ErrorParams

  constructor(code: ErrorCode | string, params: ErrorParams = {}, fallback?: string) {
    super(fallback ?? code)
    this.name = 'AppError'
    this.code = code
    this.params = params
  }
}

type Entry = string | ((p: never) => string)

export function describeError(err: unknown, m: Messages): string {
  if (!(err instanceof AppError)) {
    if (err) console.error(err)
    return m.errors.generic
  }
  if (err.code === 'http') return m.errors.http(Number(err.params.status ?? 0))
  const entry = (m.errors as Record<string, Entry>)[err.code]
  if (typeof entry === 'string') return entry
  if (typeof entry === 'function') return (entry as (p: ErrorParams) => string)(err.params)
  // 未知のコードはサーバーのメッセージ（日本語）を表示する
  return err.message !== err.code ? err.message : m.errors.generic
}
