// 書き出し（Blob化・ファイル名・ZIP・ダウンロード）。
import { AppError } from './errors'
import type { ExportFormat } from './presets'

const EXTENSIONS: Record<ExportFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' }

export const extensionFor = (format: ExportFormat): string => EXTENSIONS[format]

/** パス区切りや記号を除いた安全なファイル名を作る。 */
export function buildFileName(original: string, suffix: string, format: ExportFormat): string {
  const base = original.split(/[\\/]/).pop() ?? ''
  const stem = base.replace(/\.[^.]*$/, '')
  const safe = stem.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'image'
  return `${safe}_${suffix}.${extensionFor(format)}`
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new AppError('export_failed'))),
      `image/${format}`,
      quality,
    )
  })
}

export interface NamedBlob {
  readonly name: string
  readonly blob: Blob
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let n = 2
  while (used.has(`${stem}_${n}${ext}`)) n++
  return `${stem}_${n}${ext}`
}

export async function createZip(files: readonly NamedBlob[]): Promise<Blob> {
  // ZIP 書き出しは一部の利用者しか使わないため、必要になった時に読み込む
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const used = new Set<string>()
  for (const f of files) {
    const name = uniqueName(f.name, used)
    used.add(name)
    zip.file(name, await f.blob.arrayBuffer())
  }
  return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
