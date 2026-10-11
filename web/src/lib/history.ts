// イミュータブルな編集履歴。どの操作も新しいオブジェクトを返す。

// ラベルは表示時に翻訳できるよう、文字列ではなくキーを持たせることもできる（L）。
export interface HistoryEntry<T, L = string> {
  readonly label: L
  readonly value: T
}

export interface History<T, L = string> {
  readonly entries: readonly HistoryEntry<T, L>[]
  readonly index: number
}

export function createHistory<T, L = string>(initial: HistoryEntry<T, L>): History<T, L> {
  return { entries: [initial], index: 0 }
}

export function current<T, L>(h: History<T, L>): HistoryEntry<T, L> {
  return h.entries[h.index]
}

export const canUndo = <T, L>(h: History<T, L>): boolean => h.index > 0
export const canRedo = <T, L>(h: History<T, L>): boolean => h.index < h.entries.length - 1

/** 現在位置の後ろに追加する。やり直し用の未来の履歴は破棄し、onDrop に渡す。 */
export function push<T, L>(
  h: History<T, L>,
  entry: HistoryEntry<T, L>,
  onDrop?: (dropped: HistoryEntry<T, L>) => void,
): History<T, L> {
  const kept = h.entries.slice(0, h.index + 1)
  h.entries.slice(h.index + 1).forEach((e) => onDrop?.(e))
  return { entries: [...kept, entry], index: kept.length }
}

export function jumpTo<T, L>(h: History<T, L>, index: number): History<T, L> {
  const clamped = Math.min(Math.max(index, 0), h.entries.length - 1)
  return { ...h, index: clamped }
}

export const undo = <T, L>(h: History<T, L>): History<T, L> => jumpTo(h, h.index - 1)
export const redo = <T, L>(h: History<T, L>): History<T, L> => jumpTo(h, h.index + 1)
