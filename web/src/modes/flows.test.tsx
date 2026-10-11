import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RealEstateMode } from './realestate/RealEstateMode'
import { RestoreMode } from './restore/RestoreMode'

vi.mock('../lib/canvas', () => ({
  loadBitmap: vi.fn(async () => ({ width: 4, height: 2, close: () => {} })),
  blobToMask: vi.fn(async () => ({ data: new Uint8ClampedArray(8), width: 4, height: 2 })),
  maskToBlob: vi.fn(async () => new Blob(['mask'], { type: 'image/png' })),
}))

const png = (name = 'room.png') => new File([new Uint8Array(8)], name, { type: 'image/png' })

type Route = (url: string) => Response

function stubFetch(route: Route) {
  const fn = vi.fn(async (url: string) => route(url))
  vi.stubGlobal('fetch', fn)
  return fn
}

// Node の Response.blob() は jsdom の FormData に渡せないため、jsdom の Blob を返す偽物を使う
const imageResponse = (headers: Record<string, string> = {}) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'image/png', ...headers }),
    blob: async () => new Blob(['img'], { type: 'image/png' }),
  }) as unknown as Response

const health = (available: boolean) =>
  new Response(JSON.stringify({ success: true, data: { ai: { available, provider: 'x' } } }))

beforeEach(() => {
  let n = 0
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:${++n}`), revokeObjectURL: vi.fn() })
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never
})
afterEach(() => vi.unstubAllGlobals())

async function upload(file = png()) {
  await userEvent.upload(screen.getAllByTestId('file-input')[0], file)
  await screen.findByRole('button', { name: '1. 元画像' })
}

describe('RealEstateMode', () => {
  it('runs auto vertical and finishing, building history', async () => {
    const fetchFn = stubFetch(() => imageResponse({ 'x-picedit-applied': 'true' }))
    render(<RealEstateMode />)
    await upload()

    await userEvent.click(screen.getByRole('button', { name: '自動垂直補正' }))
    await screen.findByRole('button', { name: '2. 自動垂直補正' })
    await userEvent.click(screen.getByRole('button', { name: '仕上げを適用' }))
    await screen.findByRole('button', { name: '3. 明るさ・色の仕上げ' })

    const urls = fetchFn.mock.calls.map((c) => c[0])
    expect(urls).toEqual(['/api/realestate/auto-vertical', '/api/realestate/finish'])
    await userEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    expect(screen.getByRole('button', { name: '2. 自動垂直補正' })).toHaveAttribute('aria-current', 'step')
  })

  it('shows a message when no correction was needed', async () => {
    stubFetch(() => imageResponse({ 'x-picedit-applied': 'false' }))
    render(<RealEstateMode />)
    await upload()
    await userEvent.click(screen.getByRole('button', { name: '自動垂直補正' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('縦線が見つかりませんでした')
  })

  it('merges HDR brackets', async () => {
    const fetchFn = stubFetch(() => imageResponse())
    render(<RealEstateMode />)
    await userEvent.click(screen.getByRole('tab', { name: 'HDR合成' }))
    await userEvent.upload(screen.getByTestId('file-input'), [png('1.png'), png('2.png'), png('3.png')])
    await screen.findByRole('button', { name: '1. HDR合成（3枚）' })
    expect(fetchFn.mock.calls[0][0]).toBe('/api/realestate/hdr')
  })

  it('rejects a single HDR image', async () => {
    stubFetch(() => imageResponse())
    render(<RealEstateMode />)
    await userEvent.click(screen.getByRole('tab', { name: 'HDR合成' }))
    await userEvent.upload(screen.getByTestId('file-input'), [png('1.png')])
    expect(await screen.findByRole('alert')).toHaveTextContent('2〜5 枚')
  })

  it('opens the manual point picker and cancels', async () => {
    stubFetch(() => imageResponse())
    render(<RealEstateMode />)
    await upload()
    await userEvent.click(screen.getByRole('button', { name: '手動4点補正' }))
    expect(screen.getByTestId('point-picker-image')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByTestId('point-picker-image')).toBeNull()
  })
})

describe('RestoreMode', () => {
  it('fades, detects scratches, edits the mask and inpaints', async () => {
    const fetchFn = stubFetch((url) => (url.endsWith('/api/health') ? health(false) : imageResponse()))
    render(<RestoreMode />)
    await upload(png('old.png'))

    await userEvent.click(screen.getByRole('button', { name: '色あせを補正' }))
    await screen.findByRole('button', { name: '2. 色あせ補正' })

    await userEvent.click(screen.getByRole('button', { name: '傷を検出' }))
    const overlay = await screen.findByTestId('mask-overlay')
    overlay.getBoundingClientRect = () => ({ left: 0, top: 0, width: 4, height: 2 }) as DOMRect
    await userEvent.pointer([{ keys: '[MouseLeft>]', target: overlay, coords: { clientX: 1, clientY: 1 } }, { keys: '[/MouseLeft]' }])

    await userEvent.click(screen.getByRole('button', { name: 'マークした傷を除去' }))
    await screen.findByRole('button', { name: '3. 傷・折れ跡の除去' })
    const urls = fetchFn.mock.calls.map((c) => c[0])
    expect(urls).toContain('/api/restore/scratch-mask')
    expect(urls).toContain('/api/restore/inpaint')
  })

  it('runs an AI task when available and surfaces errors', async () => {
    stubFetch((url) => {
      if (url.endsWith('/api/health')) return health(true)
      return new Response(JSON.stringify({ success: false, error: 'AI処理に失敗しました。', code: 'ai_failed' }), {
        status: 502,
      })
    })
    render(<RestoreMode />)
    await upload(png('old.png'))
    const button = screen.getByRole('button', { name: 'カラー化' })
    await waitFor(() => expect(button).toBeEnabled())
    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('AI処理に失敗しました。')
  })
})
