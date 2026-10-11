import { useI18n } from '../../i18n/context'
import type { MallPreset } from '../../lib/presets'
import { MALL_PRESETS } from '../../lib/presets'
import { settingsFromPreset, type EcSettings } from './settings'

export interface EcOptionsProps {
  readonly settings: EcSettings
  readonly preset: MallPreset
  readonly onChange: (next: EcSettings) => void
}

export function EcOptions({ settings, preset, onChange }: EcOptionsProps) {
  const { m } = useI18n()
  const selectPreset = (id: string) => {
    const next = MALL_PRESETS.find((p) => p.id === id)
    if (next) onChange(settingsFromPreset(next, settings.shadow))
  }
  const minFill = preset.id === 'amazon' ? 0.85 : 0.5
  const o = m.ec.options

  return (
    <section className="panel options" aria-label={o.label}>
      <label className="field">
        <span>{o.destination}</span>
        <select value={settings.presetId} onChange={(e) => selectPreset(e.target.value)}>
          {MALL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {m.presets[p.id].label}
            </option>
          ))}
        </select>
      </label>
      <p className="options__notes">
        {preset.width}×{preset.height}px / {preset.format.toUpperCase()} — {m.presets[preset.id].notes}
      </p>

      <label className="field field--inline">
        <input
          type="color"
          value={settings.background}
          disabled={preset.backgroundLocked}
          onChange={(e) => onChange({ ...settings, background: e.target.value.toUpperCase() })}
        />
        <span>{preset.backgroundLocked ? o.backgroundLocked : o.background}</span>
      </label>

      <label className="field">
        <span>{o.size(Math.round(settings.fillRatio * 100))}</span>
        <input
          type="range"
          min={minFill}
          max={0.98}
          step={0.01}
          value={settings.fillRatio}
          onChange={(e) => onChange({ ...settings, fillRatio: Number(e.target.value) })}
          aria-label={o.sizeLabel}
        />
      </label>

      <label className="field field--inline">
        <input
          type="checkbox"
          checked={settings.shadow}
          onChange={(e) => onChange({ ...settings, shadow: e.target.checked })}
        />
        <span>{o.shadow}</span>
      </label>
    </section>
  )
}
