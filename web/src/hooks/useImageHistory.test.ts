import { act, renderHook } from '@testing-library/react'
import { useImageHistory } from './useImageHistory'

beforeEach(() => {
  let n = 0
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:${++n}`), revokeObjectURL: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

describe('useImageHistory', () => {
  it('applies steps, undoes and redoes', async () => {
    const { result } = renderHook(() => useImageHistory())
    const a = new Blob(['a'])
    const b = new Blob(['b'])
    act(() => result.current.reset(a))
    expect(result.current.currentBlob).toBe(a)

    await act(async () => {
      await result.current.apply({ key: 'fade' }, async () => b)
    })
    expect(result.current.currentBlob).toBe(b)
    expect(result.current.originalBlob).toBe(a)

    act(() => result.current.undo())
    expect(result.current.currentBlob).toBe(a)
    act(() => result.current.redo())
    expect(result.current.currentBlob).toBe(b)
    act(() => result.current.jumpTo(0))
    expect(result.current.currentBlob).toBe(a)
  })

  it('captures errors without changing history', async () => {
    const { result } = renderHook(() => useImageHistory())
    const a = new Blob(['a'])
    act(() => result.current.reset(a))
    let ok = true
    await act(async () => {
      ok = await result.current.apply({ key: 'fade' }, async () => {
        throw new Error('サーバーエラー')
      })
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('サーバーエラー')
    expect(result.current.currentBlob).toBe(a)
    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('apply is a no-op without an image', async () => {
    const { result } = renderHook(() => useImageHistory())
    let ok = true
    await act(async () => {
      ok = await result.current.apply({ key: 'fade' }, async () => new Blob())
    })
    expect(ok).toBe(false)
  })

  it('caches object URLs per blob and revokes on drop', async () => {
    const { result } = renderHook(() => useImageHistory())
    const a = new Blob(['a'])
    const b = new Blob(['b'])
    act(() => result.current.reset(a))
    await act(async () => {
      await result.current.apply({ key: 'fade' }, async () => b)
    })
    const url = result.current.urlFor(b)
    expect(result.current.urlFor(b)).toBe(url)
    act(() => result.current.undo())
    await act(async () => {
      await result.current.apply({ key: 'inpaint' }, async () => new Blob(['c']))
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
  })
})

describe('stepText', () => {
  it('translates step labels including counts', async () => {
    const { stepText } = await import('./useImageHistory')
    const { MESSAGES } = await import('../i18n/context')
    expect(stepText({ key: 'hdr', count: 3 }, MESSAGES.ja)).toBe('HDR合成（3枚）')
    expect(stepText({ key: 'hdr', count: 3 }, MESSAGES.en)).toBe('HDR merge (3 photos)')
    expect(stepText({ key: 'fade' }, MESSAGES.ko)).toBe('색 바램 보정')
  })
})
