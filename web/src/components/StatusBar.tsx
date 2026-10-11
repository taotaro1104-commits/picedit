import { useI18n } from '../i18n/context'
import { describeError } from '../lib/errors'

export interface StatusBarProps {
  readonly busy: string | null
  readonly progress?: number | null
  /** 任意のエラー（コード付きなら現在の言語に翻訳して表示） */
  readonly error: unknown
  readonly notice?: string | null
  readonly onDismiss: () => void
}

export function StatusBar({ busy, progress, error, notice, onDismiss }: StatusBarProps) {
  const { m } = useI18n()
  const hasError = error !== null && error !== undefined
  return (
    <div className="status" aria-live="polite">
      {busy && (
        <div className="status__busy" role="status">
          <span className="spinner" aria-hidden />
          <span>{busy}…</span>
          {progress != null && (
            <progress max={100} value={progress} aria-label={m.common.progress}>
              {Math.round(progress)}%
            </progress>
          )}
        </div>
      )}
      {notice && !hasError && <div className="status__notice">{notice}</div>}
      {hasError && (
        <div className="status__error" role="alert">
          <span>{describeError(error, m)}</span>
          <button type="button" onClick={onDismiss} aria-label={m.common.dismissError}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
