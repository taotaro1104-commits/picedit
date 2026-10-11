import { useId, useState, type DragEvent, type ReactNode } from 'react'
import { useFileIntake } from '../hooks/useFileIntake'
import { useI18n } from '../i18n/context'
import { ACCEPTED_TYPES } from '../lib/uploadRules'

export interface UploaderProps {
  readonly label: string
  readonly multiple?: boolean
  readonly maxFiles?: number
  readonly onFiles: (files: File[]) => void
  readonly onError: (error: unknown) => void
}

const limitOf = (multiple: boolean, maxFiles?: number) => maxFiles ?? (multiple ? 50 : 1)

export function Uploader({ label, multiple = false, maxFiles, onFiles, onError }: UploaderProps) {
  const { m } = useI18n()
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const { intake, converting } = useFileIntake({ maxFiles: limitOf(multiple, maxFiles), onFiles, onError })

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    intake(e.dataTransfer.files)
  }

  return (
    <label
      htmlFor={inputId}
      className={`uploader${dragging ? ' uploader--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple={multiple}
        onChange={(e) => {
          intake(e.target.files)
          e.target.value = ''
        }}
        data-testid="file-input"
      />
      <span className="uploader__icon" aria-hidden>
        ⬆
      </span>
      <span className="uploader__title">{converting ? m.uploader.converting : label}</span>
      <span className="uploader__hint">{m.uploader.hint}</span>
    </label>
  )
}

export interface DropZoneProps extends Omit<UploaderProps, 'label'> {
  readonly children: ReactNode
  readonly className?: string
}

/** 作業エリア全体をドロップ先にする（PC 向け。小さなボタンを狙わずに画像を落とせる）。 */
export function DropZone({ children, className = '', multiple = false, maxFiles, onFiles, onError }: DropZoneProps) {
  const { m } = useI18n()
  const [dragging, setDragging] = useState(false)
  const { intake } = useFileIntake({ maxFiles: limitOf(multiple, maxFiles), onFiles, onError })
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

  return (
    <div
      className={`drop-zone ${className}${dragging ? ' drop-zone--active' : ''}`}
      onDragOver={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(false)
        intake(e.dataTransfer.files)
      }}
    >
      {children}
      {dragging && <div className="drop-zone__overlay">{m.uploader.dropAnywhere}</div>}
    </div>
  )
}
