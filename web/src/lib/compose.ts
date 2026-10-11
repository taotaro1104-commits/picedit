// 商品画像の配置計算（Canvas に依存しない純粋関数）。

export interface MaskData {
  readonly data: Uint8ClampedArray // 0〜255、1ピクセル1値
  readonly width: number
  readonly height: number
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Ellipse {
  readonly cx: number
  readonly cy: number
  readonly rx: number
  readonly ry: number
}

const FOREGROUND_THRESHOLD = 64

export function computeBoundingBox(mask: MaskData, threshold = FOREGROUND_THRESHOLD): Rect | null {
  const { data, width, height } = mask
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (data[row + x] < threshold) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** 商品の外接矩形を、キャンバスの fillRatio（長辺基準）に収まるよう拡大縮小して中央に置く。 */
export function computePlacement(
  box: Rect,
  canvasWidth: number,
  canvasHeight: number,
  fillRatio: number,
): Rect {
  if (!(fillRatio > 0 && fillRatio <= 1)) {
    throw new RangeError('fillRatio must be in (0, 1]')
  }
  const scale = Math.min(
    (canvasWidth * fillRatio) / box.width,
    (canvasHeight * fillRatio) / box.height,
  )
  const width = box.width * scale
  const height = box.height * scale
  return { x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2, width, height }
}

/** 接地影（商品の足元に置く平たい楕円）。 */
export function shadowEllipse(placement: Rect): Ellipse {
  return {
    cx: placement.x + placement.width / 2,
    cy: placement.y + placement.height - Math.max(2, placement.height * 0.01),
    rx: placement.width * 0.42,
    ry: Math.max(4, placement.height * 0.035),
  }
}
