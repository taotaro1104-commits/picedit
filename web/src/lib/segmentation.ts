// 背景除去の抽象。AI（ワーカー）と簡易版（色キー）を差し替え可能にする。
import { bitmapToRgba, loadBitmap } from './canvas'
import { colorKeyMask } from './colorKey'
import type { MaskData } from './compose'

export type SegmenterKind = 'ai' | 'simple'

export interface Segmenter {
  readonly kind: SegmenterKind
  segment(blob: Blob, onProgress?: (percent: number) => void): Promise<MaskData>
}

type WorkerReply =
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'result'; data: Uint8ClampedArray; width: number; height: number }
  | { id: number; type: 'error'; message: string }

interface Pending {
  resolve: (mask: MaskData) => void
  reject: (err: Error) => void
  onProgress?: (percent: number) => void
}

export function createAiSegmenter(
  workerFactory: () => Worker = () =>
    new Worker(new URL('./segmentation.worker.ts', import.meta.url), { type: 'module' }),
): Segmenter {
  let worker: Worker | null = null
  let nextId = 1
  const pending = new Map<number, Pending>()

  const getWorker = (): Worker => {
    if (worker) return worker
    worker = workerFactory()
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const msg = event.data
      const job = pending.get(msg.id)
      if (!job) return
      if (msg.type === 'progress') {
        job.onProgress?.(msg.progress)
        return
      }
      pending.delete(msg.id)
      if (msg.type === 'result') job.resolve({ data: msg.data, width: msg.width, height: msg.height })
      else job.reject(new Error(msg.message))
    }
    return worker
  }

  return {
    kind: 'ai',
    segment(blob, onProgress) {
      return new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject, onProgress })
        getWorker().postMessage({ id, blob })
      })
    },
  }
}

export function createSimpleSegmenter(): Segmenter {
  return {
    kind: 'simple',
    async segment(blob) {
      return colorKeyMask(bitmapToRgba(await loadBitmap(blob)))
    },
  }
}

/** URL に ?segmenter=simple があれば簡易版を使う（E2E・低スペック端末向け）。 */
export function chooseSegmenterKind(search: string): SegmenterKind {
  return new URLSearchParams(search).get('segmenter') === 'simple' ? 'simple' : 'ai'
}
