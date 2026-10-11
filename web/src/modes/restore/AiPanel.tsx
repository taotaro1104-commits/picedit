import { useState } from 'react'
import type { StepKey } from '../../hooks/useImageHistory'
import { useI18n } from '../../i18n/context'
import type { AiStatus } from '../../lib/apiClient'

export type AiTask = 'upscale' | 'colorize' | 'face_restore'

const TASKS: readonly { task: AiTask; step: StepKey; help: 'upscaleHelp' | 'colorizeHelp' | 'faceRestoreHelp' }[] = [
  { task: 'upscale', step: 'upscale', help: 'upscaleHelp' },
  { task: 'colorize', step: 'colorize', help: 'colorizeHelp' },
  { task: 'face_restore', step: 'faceRestore', help: 'faceRestoreHelp' },
]

export interface AiPanelProps {
  readonly ai: AiStatus
  readonly disabled: boolean
  readonly onRun: (task: AiTask, step: StepKey, strength: number) => void
}

/** AI処理。忠実度（AI結果をどれだけ混ぜるか）を選んでから実行する。 */
export function AiPanel({ ai, disabled, onRun }: AiPanelProps) {
  const { m } = useI18n()
  const [strength, setStrength] = useState(0.7)
  return (
    <section className="panel" aria-label={m.ai.heading}>
      <h3>{m.ai.heading}</h3>
      {!ai.available && <p className="panel__note">{m.ai.off}</p>}
      <label className="field">
        <span>{m.ai.strength(Math.round(strength * 100))}</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          aria-label={m.ai.strengthLabel}
        />
        <small>{m.ai.strengthHelp}</small>
      </label>
      <div className="button-grid">
        {TASKS.map(({ task, step, help }) => (
          <button
            key={task}
            type="button"
            title={m.ai[help]}
            disabled={disabled || !ai.available}
            onClick={() => onRun(task, step, strength)}
          >
            {m.steps[step] as string}
          </button>
        ))}
      </div>
    </section>
  )
}
