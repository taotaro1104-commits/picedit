import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useI18n } from '../i18n/context'
import type { MaskData } from '../lib/compose'

type Tool = 'paint' | 'erase'

export interface MaskBrushProps {
  readonly bitmap: ImageBitmap
  readonly mask: MaskData
  /** low: マスク値が低い所（背景）を着色 / high: 高い所（傷）を着色 */
  readonly highlight: 'low' | 'high'
  readonly paintLabel: string
  readonly eraseLabel: string
  readonly onChange: (mask: MaskData) => void
}

const TINT = [255, 0, 90] as const

function overlayAlpha(value: number, highlight: 'low' | 'high'): number {
  return highlight === 'low' ? (255 - value) * 0.55 : value * 0.7
}

function paintOverlay(target: ImageData, mask: Uint8ClampedArray, highlight: 'low' | 'high') {
  for (let p = 0; p < mask.length; p++) {
    target.data.set([TINT[0], TINT[1], TINT[2], overlayAlpha(mask[p], highlight)], p * 4)
  }
}

/** 画像上をなぞってマスクを修正するブラシ。確定はポインターを離した時。 */
export function MaskBrush({ bitmap, mask, highlight, paintLabel, eraseLabel, onChange }: MaskBrushProps) {
  const { m } = useI18n()
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const working = useRef<Uint8ClampedArray>(mask.data.slice())
  const overlayImage = useRef<ImageData | null>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [tool, setTool] = useState<Tool>('erase')
  const [size, setSize] = useState(24)

  useEffect(() => {
    baseRef.current?.getContext('2d')?.drawImage(bitmap, 0, 0)
  }, [bitmap])

  useEffect(() => {
    working.current = mask.data.slice()
    const ctx = overlayRef.current?.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(mask.width, mask.height)
    paintOverlay(img, working.current, highlight)
    overlayImage.current = img
    ctx.putImageData(img, 0, 0)
  }, [mask, highlight])

  const toMaskPoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = mask.width / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale, scale }
  }

  const stamp = (cx: number, cy: number, radius: number) => {
    const img = overlayImage.current
    const value = tool === 'paint' ? 255 : 0
    const x0 = Math.max(0, Math.floor(cx - radius))
    const x1 = Math.min(mask.width - 1, Math.ceil(cx + radius))
    const y0 = Math.max(0, Math.floor(cy - radius))
    const y1 = Math.min(mask.height - 1, Math.ceil(cy + radius))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue
        const p = y * mask.width + x
        working.current[p] = value
        if (img) img.data[p * 4 + 3] = overlayAlpha(value, highlight)
      }
    }
    if (img && x1 >= x0 && y1 >= y0) {
      overlayRef.current?.getContext('2d')?.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1)
    }
  }

  const draw = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y, scale } = toMaskPoint(e)
    const radius = (size / 2) * scale
    const from = lastPoint.current ?? { x, y }
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (radius / 2)))
    for (let i = 1; i <= steps; i++) {
      stamp(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps, radius)
    }
    lastPoint.current = { x, y }
  }

  const finish = () => {
    if (!lastPoint.current) return
    lastPoint.current = null
    onChange({ data: working.current.slice(), width: mask.width, height: mask.height })
  }

  return (
    <div className="mask-brush">
      <div className="mask-brush__toolbar">
        <button type="button" aria-pressed={tool === 'erase'} onClick={() => setTool('erase')}>
          {eraseLabel}
        </button>
        <button type="button" aria-pressed={tool === 'paint'} onClick={() => setTool('paint')}>
          {paintLabel}
        </button>
        <label>
          {m.maskBrush.size(size)}
          <input type="range" min={4} max={120} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
      </div>
      <div
        className="mask-brush__stage"
        style={{
          aspectRatio: `${mask.width} / ${mask.height}`,
          // 縦長画像でも縦横比を崩さないよう、幅側で上限をかける
          width: `min(100%, calc(72vh * ${mask.width / mask.height}))`,
        }}
      >
        <canvas ref={baseRef} width={bitmap.width} height={bitmap.height} />
        <canvas
          ref={overlayRef}
          width={mask.width}
          height={mask.height}
          className="mask-brush__overlay"
          data-testid="mask-overlay"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            lastPoint.current = null
            draw(e)
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) draw(e)
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
    </div>
  )
}
