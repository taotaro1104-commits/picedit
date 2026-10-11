import { chooseSegmenterKind, createAiSegmenter } from './segmentation'

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  posted: unknown[] = []
  reply: (msg: { id: number }) => unknown[]

  constructor(reply: (msg: { id: number }) => unknown[]) {
    this.reply = reply
  }

  postMessage(msg: { id: number }) {
    this.posted.push(msg)
    queueMicrotask(() => {
      for (const r of this.reply(msg)) this.onmessage?.({ data: r } as MessageEvent)
    })
  }
}

describe('chooseSegmenterKind', () => {
  it('uses simple only when requested', () => {
    expect(chooseSegmenterKind('?segmenter=simple')).toBe('simple')
    expect(chooseSegmenterKind('')).toBe('ai')
  })
})

describe('createAiSegmenter', () => {
  it('resolves with the mask and forwards progress', async () => {
    const data = new Uint8ClampedArray([0, 255])
    const worker = new FakeWorker(({ id }) => [
      { id, type: 'progress', progress: 50 },
      { id: 999, type: 'progress', progress: 1 },
      { id, type: 'result', data, width: 2, height: 1 },
    ])
    const seg = createAiSegmenter(() => worker as unknown as Worker)
    const progress: number[] = []
    const mask = await seg.segment(new Blob(['x']), (p) => progress.push(p))
    expect(mask).toEqual({ data, width: 2, height: 1 })
    expect(progress).toEqual([50])
    expect(seg.kind).toBe('ai')
  })

  it('rejects on worker error and reuses the worker', async () => {
    let created = 0
    const worker = new FakeWorker(({ id }) => [{ id, type: 'error', message: 'model failed' }])
    const seg = createAiSegmenter(() => {
      created++
      return worker as unknown as Worker
    })
    await expect(seg.segment(new Blob(['x']))).rejects.toThrow('model failed')
    await expect(seg.segment(new Blob(['y']))).rejects.toThrow('model failed')
    expect(created).toBe(1)
  })
})
