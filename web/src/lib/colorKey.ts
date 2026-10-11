// 簡易背景除去（背景がほぼ単色の写真向け）。
// AIモデルが読み込めない環境のフォールバック、および E2E テスト用。
import type { MaskData } from './compose'

export interface RgbaImage {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

/** 画像の外周ピクセルの中央値を背景色とみなす。 */
export function estimateBorderColor(img: RgbaImage): [number, number, number] {
  const { data, width, height } = img
  const channels: number[][] = [[], [], []]
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4
    for (let c = 0; c < 3; c++) channels[c].push(data[i + c])
  }
  for (let x = 0; x < width; x++) {
    sample(x, 0)
    sample(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    sample(0, y)
    sample(width - 1, y)
  }
  const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]
  return [median(channels[0]), median(channels[1]), median(channels[2])]
}

export function colorKeyMask(img: RgbaImage, tolerance = 48): MaskData {
  const bg = estimateBorderColor(img)
  const { data, width, height } = img
  const out = new Uint8ClampedArray(width * height)
  const softEdge = tolerance * 0.5
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])
    // tolerance 付近はなだらかに遷移させ、輪郭のギザギザを抑える
    const t = (dist - tolerance + softEdge) / (2 * softEdge)
    out[p] = Math.round(Math.min(1, Math.max(0, t)) * 255)
  }
  return { data: out, width, height }
}
