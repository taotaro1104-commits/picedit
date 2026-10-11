// EC モードの商品リストと背景除去の実行を管理する。
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadBitmap } from '../../lib/canvas'
import type { MaskData } from '../../lib/compose'
import { AppError } from '../../lib/errors'
import type { Segmenter, SegmenterKind } from '../../lib/segmentation'
import { createAiSegmenter, createSimpleSegmenter } from '../../lib/segmentation'

export type ItemStatus = 'pending' | 'segmenting' | 'ready' | 'error'

export interface EcItem {
  readonly id: string
  readonly file: File
  readonly thumbUrl: string
  readonly status: ItemStatus
  readonly bitmap: ImageBitmap | null
  readonly mask: MaskData | null
  /** 表示時に describeError で翻訳する */
  readonly error: unknown
}

function makeSegmenter(kind: SegmenterKind): Segmenter {
  return kind === 'simple' ? createSimpleSegmenter() : createAiSegmenter()
}

export function useEcItems(initialKind: SegmenterKind) {
  const [items, setItems] = useState<readonly EcItem[]>([])
  const [progress, setProgress] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  // AI が使えず簡易背景除去に切り替えたか（画面に案内を出す）
  const [usedFallback, setUsedFallback] = useState(false)
  const segmenter = useRef<Segmenter>(makeSegmenter(initialKind))
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const update = useCallback((id: string, patch: Partial<EcItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  useEffect(
    () => () =>
      itemsRef.current.forEach((it) => {
        URL.revokeObjectURL(it.thumbUrl)
        it.bitmap?.close()
      }),
    [],
  )

  const segmentOne = useCallback(async (item: EcItem): Promise<void> => {
    update(item.id, { status: 'segmenting', error: null })
    try {
      // デコード済みの画像はすぐ保存し、再試行のたびに作り直さない
      const bitmap = item.bitmap ?? (await loadBitmap(item.file))
      if (!item.bitmap) update(item.id, { bitmap })
      let mask: MaskData
      try {
        mask = await segmenter.current.segment(item.file, (p) => setProgress(p))
      } catch (err) {
        if (segmenter.current.kind !== 'ai') throw err
        console.warn('AI segmentation failed, falling back', err)
        segmenter.current = createSimpleSegmenter()
        setUsedFallback(true)
        mask = await segmenter.current.segment(item.file)
      }
      update(item.id, { status: 'ready', mask })
    } catch (err) {
      update(item.id, { status: 'error', error: err instanceof AppError ? err : new AppError('segmentation_failed') })
    } finally {
      setProgress(null)
    }
  }, [update])

  // 追加が連続しても1枚ずつ順番に処理するためのキュー
  const queue = useRef<Promise<void>>(Promise.resolve())
  const queued = useRef(0)

  const processPending = useCallback((targets: readonly EcItem[]): Promise<void> => {
    queued.current += 1
    setRunning(true)
    queue.current = queue.current.then(async () => {
      for (const item of targets) await segmentOne(item)
      queued.current -= 1
      if (queued.current === 0) setRunning(false)
    })
    return queue.current
  }, [segmentOne])

  const addFiles = useCallback((files: File[]): EcItem[] => {
    const added = files.map<EcItem>((file) => ({
      id: crypto.randomUUID(),
      file,
      thumbUrl: URL.createObjectURL(file),
      status: 'pending',
      bitmap: null,
      mask: null,
      error: null,
    }))
    setItems((prev) => [...prev, ...added])
    void processPending(added)
    return added
  }, [processPending])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id)
      if (target) {
        URL.revokeObjectURL(target.thumbUrl)
        target.bitmap?.close()
      }
      return prev.filter((it) => it.id !== id)
    })
  }, [])

  const setMask = useCallback((id: string, mask: MaskData) => update(id, { mask }), [update])

  const retry = useCallback(
    () => processPending(itemsRef.current.filter((it) => it.status === 'error')),
    [processPending],
  )

  return { items, progress, running, usedFallback, addFiles, removeItem, setMask, retry }
}
