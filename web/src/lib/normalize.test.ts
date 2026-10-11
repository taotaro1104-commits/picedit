import { normalizeUpload } from './normalize'

afterEach(() => vi.unstubAllGlobals())

describe('normalizeUpload', () => {
  it('returns browser-friendly files as-is', async () => {
    const fetchFn = vi.fn()
    vi.stubGlobal('fetch', fetchFn)
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    expect(await normalizeUpload(file)).toBe(file)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('converts HEIC through the API', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('jpegdata'))
    vi.stubGlobal('fetch', fetchFn)
    const out = await normalizeUpload(new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' }))
    expect(fetchFn.mock.calls[0][0]).toBe('/api/convert')
    expect(out.name).toBe('IMG_1.jpg')
    expect(out.type).toBe('image/jpeg')
  })
})

describe('inferMimeType', () => {
  it('uses the file type or falls back to the extension', async () => {
    const { inferMimeType } = await import('./normalize')
    expect(inferMimeType(new File([''], 'a.png', { type: 'image/PNG' }))).toBe('image/png')
    expect(inferMimeType(new File([''], 'IMG.HEIC'))).toBe('image/heic')
    expect(inferMimeType(new File([''], 'noext'))).toBe('')
  })
})
