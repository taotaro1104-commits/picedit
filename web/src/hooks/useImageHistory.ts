// Blob の編集履歴＋処理中/エラー状態を管理するフック（不動産・修復モード共通）。
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Messages } from '../i18n/messages/ja'
import type { History } from '../lib/history'
import * as hist from '../lib/history'

export type StepKey = keyof Messages['steps']

/** 履歴のラベル。言語を切り替えても翻訳し直せるよう、文字列ではなくキーで持つ。 */
export interface StepLabel {
  readonly key: StepKey
  readonly count?: number
}

export function stepText(label: StepLabel, m: Messages): string {
  const entry = m.steps[label.key]
  return typeof entry === 'function' ? entry(label.count ?? 0) : entry
}

export type ImageHistory = History<Blob, StepLabel>

export interface ImageHistoryApi {
  readonly history: ImageHistory | null
  readonly currentBlob: Blob | null
  readonly originalBlob: Blob | null
  /** 処理中のステップ（null なら待機中） */
  readonly busy: StepLabel | null
  /** 表示時に describeError で翻訳する */
  readonly error: unknown
  urlFor(blob: Blob): string
  reset(blob: Blob, label?: StepLabel): void
  apply(label: StepLabel, fn: (current: Blob) => Promise<Blob>): Promise<boolean>
  undo(): void
  redo(): void
  jumpTo(index: number): void
  clearError(): void
  setError(error: unknown): void
}

export function useImageHistory(): ImageHistoryApi {
  const [history, setHistory] = useState<ImageHistory | null>(null)
  const [busy, setBusy] = useState<StepLabel | null>(null)
  const [error, setError] = useState<unknown>(null)
  const urls = useRef(new Map<Blob, string>())

  const urlFor = useCallback((blob: Blob) => {
    const cached = urls.current.get(blob)
    if (cached) return cached
    const url = URL.createObjectURL(blob)
    urls.current.set(blob, url)
    return url
  }, [])

  const release = useCallback((blob: Blob) => {
    const url = urls.current.get(blob)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(blob)
  }, [])

  useEffect(() => {
    const map = urls.current
    return () => map.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const reset = useCallback(
    (blob: Blob, label: StepLabel = { key: 'original' }) => {
      setHistory((prev) => {
        prev?.entries.forEach((e) => release(e.value))
        return hist.createHistory<Blob, StepLabel>({ label, value: blob })
      })
      setError(null)
    },
    [release],
  )

  const apply = useCallback(
    async (label: StepLabel, fn: (current: Blob) => Promise<Blob>) => {
      if (!history || busy) return false
      setBusy(label)
      setError(null)
      try {
        const next = await fn(hist.current(history).value)
        setHistory((prev) => prev && hist.push(prev, { label, value: next }, (e) => release(e.value)))
        return true
      } catch (err) {
        setError(err)
        return false
      } finally {
        setBusy(null)
      }
    },
    [history, busy, release],
  )

  const undo = useCallback(() => setHistory((h) => h && hist.undo(h)), [])
  const redo = useCallback(() => setHistory((h) => h && hist.redo(h)), [])
  const jumpTo = useCallback((index: number) => setHistory((h) => h && hist.jumpTo(h, index)), [])
  const clearError = useCallback(() => setError(null), [])

  return {
    history,
    currentBlob: history ? hist.current(history).value : null,
    originalBlob: history ? history.entries[0].value : null,
    busy,
    error,
    urlFor,
    reset,
    apply,
    undo,
    redo,
    jumpTo,
    clearError,
    setError,
  }
}
