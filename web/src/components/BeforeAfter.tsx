import { useState } from 'react'
import { useI18n } from '../i18n/context'

export interface BeforeAfterProps {
  readonly beforeUrl: string
  readonly afterUrl: string
  readonly alt: string
}

/** 修正前後を左右スライダーで比較するビュー。画像上をドラッグ／タップしても動かせる。 */
export function BeforeAfter({ beforeUrl, afterUrl, alt }: BeforeAfterProps) {
  const { m } = useI18n()
  const [position, setPosition] = useState(50)

  const moveTo = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    setPosition(Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))))
  }

  return (
    <div className="before-after">
      <div
        className="before-after__stage"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          moveTo(e.clientX, e.currentTarget)
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) moveTo(e.clientX, e.currentTarget)
        }}
      >
        <img src={beforeUrl} alt={`${alt}（${m.common.before}）`} className="before-after__img" draggable={false} />
        <img
          src={afterUrl}
          alt={`${alt}（${m.common.after}）`}
          className="before-after__img before-after__img--after"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          draggable={false}
          data-testid="after-image"
        />
        <div className="before-after__divider" style={{ left: `${position}%` }} />
        <span className="before-after__tag before-after__tag--left">{m.common.before}</span>
        <span className="before-after__tag before-after__tag--right">{m.common.after}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label={m.common.comparePosition}
      />
    </div>
  )
}
