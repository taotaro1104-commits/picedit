import { MESSAGES } from '../i18n/context'
import { AppError, describeError } from './errors'

const ja = MESSAGES.ja
const en = MESSAGES.en

describe('describeError', () => {
  it('translates known codes with params', () => {
    const err = new AppError('file_too_large', { limit_mb: 20 })
    expect(describeError(err, ja)).toBe('ファイルが大きすぎます（上限 20MB）。')
    expect(describeError(err, en)).toBe('The file is too large (max 20MB).')
  })

  it('handles string entries and http errors', () => {
    expect(describeError(new AppError('ai_failed'), en)).toMatch('AI processing failed')
    expect(describeError(new AppError('http', { status: 503 }), en)).toMatch('(503)')
  })

  it('falls back to server message for unknown codes, generic otherwise', () => {
    expect(describeError(new AppError('brand_new', {}, 'サーバー側の説明'), en)).toBe('サーバー側の説明')
    expect(describeError(new AppError('brand_new'), en)).toBe(en.errors.generic)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(describeError(new Error('boom'), ja)).toBe(ja.errors.generic)
    expect(describeError(null, ja)).toBe(ja.errors.generic)
  })
})

describe('messages', () => {
  it('every locale defines every key with the same shape', () => {
    const shape = (o: unknown): unknown =>
      typeof o === 'object' && o !== null
        ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.length : shape(v)]))
        : typeof o
    const base = shape(ja)
    for (const [locale, m] of Object.entries(MESSAGES)) {
      expect({ locale, shape: shape(m) }).toEqual({ locale, shape: base })
    }
  })
})
