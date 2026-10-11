import { findPreset, MALL_PRESETS, parsePresets } from './presets'

describe('presets', () => {
  it('loads the bundled mall presets', () => {
    expect(MALL_PRESETS.map((p) => p.id)).toEqual(['amazon', 'rakuten', 'yahoo', 'mercari'])
  })

  it('amazon preset satisfies the 85% / pure white / 1000px rules', () => {
    const amazon = findPreset('amazon')
    expect(amazon.fillRatio).toBeGreaterThanOrEqual(0.85)
    expect(amazon.background).toBe('#FFFFFF')
    expect(amazon.backgroundLocked).toBe(true)
    expect(Math.max(amazon.width, amazon.height)).toBeGreaterThanOrEqual(1000)
  })

  it('throws for unknown ids', () => {
    expect(() => findPreset('nope')).toThrow()
  })

  it('rejects malformed preset data', () => {
    expect(() => parsePresets({ presets: [{ id: 'x' }] })).toThrow(/invalid preset/)
    expect(() => parsePresets(null)).toThrow()
    const bad = { ...MALL_PRESETS[0], fillRatio: 2 }
    expect(() => parsePresets({ presets: [{ ...MALL_PRESETS[0], id: 'ebay' }] })).toThrow(/invalid preset/)
    expect(() => parsePresets({ presets: [bad] })).toThrow(/invalid preset/)
  })
})
