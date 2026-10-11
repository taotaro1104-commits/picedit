import { ApiError, fetchHealth, postImage } from './apiClient'

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('postImage', () => {
  it('sends multipart form data and returns the blob and headers', async () => {
    const fetchFn = mockFetch(
      new Response('img', {
        status: 200,
        headers: { 'X-Picedit-Applied': 'true' },
      }),
    )
    const result = await postImage('/api/realestate/finish', {
      files: { file: new Blob(['x'], { type: 'image/png' }) },
      fields: { highlight: 0.4, clahe: false },
      query: { format: 'jpeg' },
    })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('/api/realestate/finish?format=jpeg')
    const body = init.body as FormData
    expect(body.get('highlight')).toBe('0.4')
    expect(body.get('clahe')).toBe('false')
    expect(body.get('file')).toBeInstanceOf(Blob)
    expect(await result.blob.text()).toBe('img')
    expect(result.headers.get('x-picedit-applied')).toBe('true')
  })

  it('appends multiple files under the same key', async () => {
    const fetchFn = mockFetch(new Response('ok'))
    await postImage('/api/realestate/hdr', {
      files: { files: [new Blob(['a']), new Blob(['b'])] },
    })
    expect((fetchFn.mock.calls[0][1].body as FormData).getAll('files')).toHaveLength(2)
  })

  it('throws ApiError with the server message', async () => {
    mockFetch(
      new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: 'ファイルが大きすぎます',
          code: 'file_too_large',
          params: { limit_mb: 20 },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    )
    await expect(postImage('/api/restore/fade', { files: {} })).rejects.toMatchObject({
      status: 400,
      code: 'file_too_large',
      params: { limit_mb: 20 },
      message: 'ファイルが大きすぎます',
    })
  })

  it('throws a generic ApiError for non-JSON errors', async () => {
    mockFetch(new Response('oops', { status: 500 }))
    await expect(postImage('/api/x', { files: {} })).rejects.toMatchObject({
      code: 'http',
      params: { status: 500 },
    })
    mockFetch(new Response('oops', { status: 502 }))
    await expect(postImage('/api/x', { files: {} })).rejects.toBeInstanceOf(ApiError)
  })

  it('wraps network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    await expect(postImage('/api/x', { files: {} })).rejects.toMatchObject({ status: 0, code: 'network' })
  })
})

describe('fetchHealth', () => {
  it('returns AI availability', async () => {
    mockFetch(
      new Response(
        JSON.stringify({ success: true, data: { status: 'ok', ai: { available: true, provider: 'replicate' } } }),
      ),
    )
    expect(await fetchHealth()).toEqual({ available: true, provider: 'replicate' })
  })

  it('falls back to unavailable on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('down')))
    expect(await fetchHealth()).toEqual({ available: false, provider: 'none' })
  })
})
