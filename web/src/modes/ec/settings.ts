import type { MallPreset } from '../../lib/presets'

export interface EcSettings {
  readonly presetId: string
  readonly background: string
  readonly fillRatio: number
  readonly shadow: boolean
}

export function settingsFromPreset(preset: MallPreset, shadow = true): EcSettings {
  return { presetId: preset.id, background: preset.background, fillRatio: preset.fillRatio, shadow }
}
