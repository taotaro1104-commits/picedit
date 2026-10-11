import { stepText, type ImageHistory } from '../hooks/useImageHistory'
import { useI18n } from '../i18n/context'
import { canRedo, canUndo } from '../lib/history'

export interface HistoryPanelProps {
  readonly history: ImageHistory
  readonly disabled: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onJump: (index: number) => void
}

/** 編集履歴。任意の段階をクリックするとその状態に戻る。 */
export function HistoryPanel({ history, disabled, onUndo, onRedo, onJump }: HistoryPanelProps) {
  const { m } = useI18n()
  return (
    <section className="panel history" aria-label={m.common.history}>
      <div className="history__actions">
        <button type="button" onClick={onUndo} disabled={disabled || !canUndo(history)}>
          {m.common.undo}
        </button>
        <button type="button" onClick={onRedo} disabled={disabled || !canRedo(history)}>
          {m.common.redo}
        </button>
      </div>
      <ol className="history__list">
        {history.entries.map((entry, i) => (
          <li key={i}>
            <button
              type="button"
              className={i === history.index ? 'is-current' : ''}
              aria-current={i === history.index ? 'step' : undefined}
              disabled={disabled}
              onClick={() => onJump(i)}
            >
              {i + 1}. {stepText(entry.label, m)}
            </button>
          </li>
        ))}
      </ol>
      <p className="history__hint desktop-only">{m.common.shortcuts}</p>
    </section>
  )
}
