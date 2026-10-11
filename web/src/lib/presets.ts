// モール別の書き出しプリセット。JSON を読み込み時に検証する。
import raw from '../presets/malls.json'

export type ExportFormat = 'jpeg' | 'png' | 'webp'

export type PresetId = 'amazon' | 'rakuten' | 'yahoo' | 'mercari'
const PRESET_IDS: readonly string[] = ['amazon', 'rakuten', 'yahoo', 'mercari']

/** 表示名・注意書きは i18n の presets[id] にある。 */
export interface MallPreset {
  readonly id: PresetId
  readonly width: number
  readonly height: number
  readonly fillRatio: number
  readonly background: string
  readonly backgroundLocked: boolean
  readonly format: ExportFormat
  readonly quality: number
}

const FORMATS: readonly string[] = ['jpeg', 'png', 'webp']
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

function isPreset(v: unknown): v is MallPreset {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.id === 'string' && PRESET_IDS.includes(p.id) &&
    Number.isInteger(p.width) && (p.width as number) > 0 && (p.width as number) <= 8000 &&
    Number.isInteger(p.height) && (p.height as number) > 0 && (p.height as number) <= 8000 &&
    typeof p.fillRatio === 'number' && p.fillRatio > 0 && p.fillRatio <= 1 &&
    typeof p.background === 'string' && HEX_COLOR.test(p.background) &&
    typeof p.backgroundLocked === 'boolean' &&
    typeof p.format === 'string' && FORMATS.includes(p.format) &&
    typeof p.quality === 'number' && p.quality > 0 && p.quality <= 1
  )
}

export function parsePresets(data: unknown): readonly MallPreset[] {
  const list = (data as { presets?: unknown } | null)?.presets
  if (!Array.isArray(list)) throw new Error('presets must be an array')
  return list.map((p, i) => {
    if (!isPreset(p)) throw new Error(`invalid preset at index ${i}`)
    const { id, width, height, fillRatio, background, backgroundLocked, format, quality } = p
    return Object.freeze({ id, width, height, fillRatio, background, backgroundLocked, format, quality })
  })
}

export const MALL_PRESETS: readonly MallPreset[] = parsePresets(raw)

export function findPreset(id: string): MallPreset {
  const preset = MALL_PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`unknown preset: ${id}`)
  return preset
}
