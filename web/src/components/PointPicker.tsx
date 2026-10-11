import { useState, type MouseEvent } from 'react'
import { useI18n } from '../i18n/context'

export type Point = readonly [number, number]

export interface PointPickerProps {
  readonly imageUrl: string
  readonly onConfirm: (points: readonly Point[]) => void
  readonly onCancel: () => void
}

/** 画像上で4点（左上→右上→右下→左下）をクリックして指定する。座標は元画像のピクセル単位。 */
export function PointPicker({ imageUrl, onConfirm, onCancel }: PointPickerProps) {
  const { m } = useI18n()
  const [points, setPoints] = useState<readonly Point[]>([])
  const [display, setDisplay] = useState<readonly Point[]>([])

  const onClick = (e: MouseEvent<HTMLImageElement>) => {
    if (points.length >= 4) return
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / rect.width
    const ry = (e.clientY - rect.top) / rect.height
    setPoints([...points, [rx * img.naturalWidth, ry * img.naturalHeight]])
    setDisplay([...display, [rx * 100, ry * 100]])
  }

  const next = m.pointPicker.corners[points.length]
  return (
    <div className="point-picker">
      <p>{next ? m.pointPicker.instruction(next, points.length) : m.pointPicker.done}</p>
      <div className="point-picker__stage">
        <img src={imageUrl} alt={m.pointPicker.alt} onClick={onClick} data-testid="point-picker-image" />
        {display.map(([x, y], i) => (
          <span key={i} className="point-picker__dot" style={{ left: `${x}%`, top: `${y}%` }}>
            {i + 1}
          </span>
        ))}
      </div>
      <div className="toolbar">
        <button
          type="button"
          onClick={() => {
            setPoints([])
            setDisplay([])
          }}
        >
          {m.pointPicker.reset}
        </button>
        <button type="button" onClick={onCancel}>
          {m.common.cancel}
        </button>
        <button type="button" className="primary" disabled={points.length !== 4} onClick={() => onConfirm(points)}>
          {m.pointPicker.confirm}
        </button>
      </div>
    </div>
  )
}
