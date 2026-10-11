// アップロードファイルの検証ルール（クライアント側。サーバー側でも同じ検証を行う）。
import { AppError } from './errors'
import { inferMimeType } from './normalize'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_FILE_BYTES = 20 * 1024 * 1024

/** ファイル形式・サイズ・枚数を検証し、問題があればエラー（コード付き）を返す。 */
export function validateFiles(files: File[], maxFiles: number): AppError | null {
  if (files.length === 0) return null
  if (files.length > maxFiles) return new AppError('too_many_files', { max: maxFiles })
  const badType = files.find((f) => !ACCEPTED_TYPES.includes(inferMimeType(f)))
  if (badType) return new AppError('bad_file_type', { name: badType.name })
  const tooBig = files.find((f) => f.size > MAX_FILE_BYTES)
  if (tooBig) return new AppError('bad_file_size', { name: tooBig.name })
  return null
}
