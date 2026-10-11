import type { ImageHistoryApi } from '../hooks/useImageHistory'
import { useI18n } from '../i18n/context'
import { buildFileName, downloadBlob } from '../lib/export'
import { BeforeAfter } from './BeforeAfter'
import { HistoryPanel } from './HistoryPanel'

export interface ResultViewProps {
  readonly api: ImageHistoryApi
  readonly fileName: string
  readonly suffix: string
}

/** 修正前後の比較・編集履歴・ダウンロードをまとめた表示。 */
export function ResultView({ api, fileName, suffix }: ResultViewProps) {
  const { m } = useI18n()
  const { history, currentBlob, originalBlob } = api
  if (!history || !currentBlob || !originalBlob) return null
  const format = currentBlob.type === 'image/jpeg' ? 'jpeg' : 'png'

  return (
    <div className="result">
      <BeforeAfter beforeUrl={api.urlFor(originalBlob)} afterUrl={api.urlFor(currentBlob)} alt={fileName} />
      <div className="result__side">
        {/* モバイルでは画面下部に固定表示される主要アクション */}
        <button
          type="button"
          className="primary primary-action"
          disabled={!!api.busy}
          onClick={() => downloadBlob(currentBlob, buildFileName(fileName, suffix, format))}
        >
          {m.common.download}
        </button>
        <HistoryPanel
          history={history}
          disabled={!!api.busy}
          onUndo={api.undo}
          onRedo={api.redo}
          onJump={api.jumpTo}
        />
      </div>
    </div>
  )
}
