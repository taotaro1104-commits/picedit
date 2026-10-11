// ブラウザで扱えない形式（HEIC）を API で JPEG に変換してから使う。
import { postImage } from './apiClient'

const NEEDS_CONVERSION = ['image/heic', 'image/heif']
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

/** MIME が空の場合（Windows で HEIC を選んだ時など）は拡張子から推定する。 */
export function inferMimeType(file: File): string {
  if (file.type) return file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? ''
}

export async function normalizeUpload(file: File): Promise<File> {
  const mime = inferMimeType(file)
  if (!NEEDS_CONVERSION.includes(mime)) {
    return file.type ? file : new File([file], file.name, { type: mime })
  }
  const typed = new File([file], file.name, { type: mime })
  const { blob } = await postImage('/api/convert', { files: { file: typed } })
  const name = file.name.replace(/\.[^.]*$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}
