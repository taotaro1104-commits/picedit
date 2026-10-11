import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EcMode } from './EcMode'
import { useEcItems } from './useEcItems'

const segment = vi.fn()
let segmenterKind: 'ai' | 'simple' = 'ai'

vi.mock('../../lib/segmentation', () => ({
  createAiSegmenter: () => ({ kind: 'ai', segment: (...a: unknown[]) => segment('ai', ...a) }),
  createSimpleSegmenter: () => ({ kind: 'simple', segment: (...a: unknown[]) => segment('simple', ...a) }),
  chooseSegmenterKind: () => segmenterKind,
}))

vi.mock('../../lib/canvas', () => ({
  loadBitmap: vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })),
  renderProduct: vi.fn(() => ({
    toBlob: (cb: (b: Blob) => void) => cb(new Blob(['out'], { type: 'image/jpeg' })),
  })),
}))

const download = vi.fn()
vi.mock('../../lib/export', async (orig) => ({
  ...(await orig<typeof import('../../lib/export')>()),
  downloadBlob: (...a: unknown[]) => download(...a),
}))

const mask = { data: new Uint8ClampedArray([0, 255, 255, 0]), width: 2, height: 2 }
const png = (name: string) => new File([new Uint8Array(4)], name, { type: 'image/png' })

beforeEach(() => {
  segment.mockReset()
  download.mockReset()
  segmenterKind = 'ai'
  let n = 0
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:${++n}`), revokeObjectURL: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

describe('useEcItems', () => {
  it('segments added files in order', async () => {
    segment.mockResolvedValue(mask)
    const { result } = renderHook(() => useEcItems('ai'))
    act(() => {
      result.current.addFiles([png('a.png'), png('b.png')])
    })
    await waitFor(() => expect(result.current.items.every((i) => i.status === 'ready')).toBe(true))
    expect(result.current.running).toBe(false)
    expect(result.current.items[0].mask).toBe(mask)
  })

  it('falls back to the simple segmenter when AI fails', async () => {
    segment.mockImplementation(async (kind: string) => {
      if (kind === 'ai') throw new Error('no webgpu')
      return mask
    })
    const { result } = renderHook(() => useEcItems('ai'))
    act(() => {
      result.current.addFiles([png('a.png')])
    })
    await waitFor(() => expect(result.current.items[0].status).toBe('ready'))
    expect(result.current.usedFallback).toBe(true)
  })

  it('marks errors, retries and removes items', async () => {
    segment.mockRejectedValueOnce(new Error('broken')).mockResolvedValue(mask)
    const { result } = renderHook(() => useEcItems('simple'))
    act(() => {
      result.current.addFiles([png('a.png')])
    })
    await waitFor(() => expect(result.current.items[0].status).toBe('error'))
    expect(result.current.items[0].error).toMatchObject({ code: 'segmentation_failed' })
    await act(async () => {
      await result.current.retry()
    })
    expect(result.current.items[0].status).toBe('ready')
    act(() => result.current.setMask(result.current.items[0].id, { ...mask }))
    act(() => result.current.removeItem(result.current.items[0].id))
    expect(result.current.items).toHaveLength(0)
  })
})

describe('EcMode', () => {
  it('uploads, previews and exports single and zip', async () => {
    segment.mockResolvedValue(mask)
    render(<EcMode />)
    await userEvent.upload(screen.getByTestId('file-input'), [png('a.png'), png('b.png')])
    expect(await screen.findByTestId('ec-preview')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('完了')).toHaveLength(2))

    await userEvent.click(screen.getByRole('button', { name: 'この写真を書き出し' }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0][1]).toBe('a_amazon.jpg')

    await userEvent.click(screen.getByRole('button', { name: /すべてZIPで書き出し/ }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2))
    expect(download.mock.calls[1][1]).toBe('picedit_amazon.zip')
  })

  it('toggles the mask editor', async () => {
    segment.mockResolvedValue(mask)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never
    render(<EcMode />)
    await userEvent.upload(screen.getByTestId('file-input'), [png('a.png')])
    await userEvent.click(await screen.findByRole('button', { name: 'マスクを修正' }))
    expect(screen.getByTestId('mask-overlay')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '戻す（商品にする）' }))
    await userEvent.click(screen.getByRole('button', { name: 'プレビューに戻る' }))
    expect(screen.queryByTestId('mask-overlay')).toBeNull()
  })
})
