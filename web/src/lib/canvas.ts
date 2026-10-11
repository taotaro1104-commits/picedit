// Canvas まわりのブラウザ依存ヘルパー（E2E で検証する）。
import type { RgbaImage } from './colorKey'
import { AppError } from './errors'
import type { MaskData } from './compose'
import { computeBoundingBox, computePlacement, shadowEllipse } from './compose'

export function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AppError('canvas_unsupported')
  return ctx
}

export function bitmapToRgba(bitmap: ImageBitmap): RgbaImage {
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const ctx = context2d(canvas)
  ctx.drawImage(bitmap, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  return { data, width, height }
}

export function maskToBlob(mask: MaskData): Promise<Blob> {
  const canvas = createCanvas(mask.width, mask.height)
  const ctx = context2d(canvas)
  const img = ctx.createImageData(mask.width, mask.height)
  for (let p = 0; p < mask.data.length; p++) {
    const v = mask.data[p]
    img.data.set([v, v, v, 255], p * 4)
  }
  ctx.putImageData(img, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new AppError('export_failed'))), 'image/png'),
  )
}

export async function blobToMask(blob: Blob): Promise<MaskData> {
  const rgba = bitmapToRgba(await loadBitmap(blob))
  const data = new Uint8ClampedArray(rgba.width * rgba.height)
  for (let p = 0; p < data.length; p++) data[p] = rgba.data[p * 4]
  return { data, width: rgba.width, height: rgba.height }
}

/** マスクをアルファに使って切り抜いた Canvas を作る。 */
export function cutout(source: ImageBitmap, mask: MaskData): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height)
  const ctx = context2d(canvas)
  ctx.drawImage(source, 0, 0)
  const img = ctx.getImageData(0, 0, source.width, source.height)
  for (let p = 0; p < mask.data.length; p++) img.data[p * 4 + 3] = mask.data[p]
  ctx.putImageData(img, 0, 0)
  return canvas
}

export interface ProductRenderOptions {
  readonly width: number
  readonly height: number
  readonly background: string
  readonly fillRatio: number
  readonly shadow: boolean
}

export function renderProduct(
  source: ImageBitmap,
  mask: MaskData,
  options: ProductRenderOptions,
): HTMLCanvasElement {
  const box = computeBoundingBox(mask)
  if (!box) throw new AppError('no_product')
  const canvas = createCanvas(options.width, options.height)
  const ctx = context2d(canvas)
  ctx.fillStyle = options.background
  ctx.fillRect(0, 0, options.width, options.height)

  const place = computePlacement(box, options.width, options.height, options.fillRatio)
  if (options.shadow) {
    const s = shadowEllipse(place)
    ctx.save()
    ctx.filter = `blur(${Math.max(2, s.ry * 0.8)}px)`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    cutout(source, mask),
    box.x, box.y, box.width, box.height,
    place.x, place.y, place.width, place.height,
  )
  return canvas
}
