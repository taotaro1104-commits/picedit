// ファイル受け付け（検証 → HEIC 変換 → onFiles）。アップローダーとページ全体のドロップで共用する。
import { useCallback, useState } from 'react'
import { normalizeUpload } from '../lib/normalize'
import { validateFiles } from '../lib/uploadRules'

export interface FileIntakeOptions {
  readonly maxFiles: number
  readonly onFiles: (files: File[]) => void
  readonly onError: (error: unknown) => void
}

export function useFileIntake({ maxFiles, onFiles, onError }: FileIntakeOptions) {
  const [converting, setConverting] = useState(false)

  const intake = useCallback(
    (list: FileList | readonly File[] | null) => {
      const files = Array.from(list ?? [])
      const error = validateFiles(files, maxFiles)
      if (error) {
        onError(error)
        return
      }
      if (files.length === 0) return
      setConverting(true)
      Promise.all(files.map(normalizeUpload))
        .then(onFiles)
        .catch(onError)
        .finally(() => setConverting(false))
    },
    [maxFiles, onFiles, onError],
  )

  return { intake, converting }
}
