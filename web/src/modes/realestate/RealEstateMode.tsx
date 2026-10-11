import { useCallback, useState } from 'react'
import { AdSlot } from '../../components/AdSlot'
import { PointPicker, type Point } from '../../components/PointPicker'
import { ResultView } from '../../components/ResultView'
import { StatusBar } from '../../components/StatusBar'
import { DropZone, Uploader } from '../../components/Uploader'
import { stepText, useImageHistory } from '../../hooks/useImageHistory'
import { useUndoShortcuts } from '../../hooks/useUndoShortcuts'
import { useI18n } from '../../i18n/context'
import { postImage } from '../../lib/apiClient'
import { AppError } from '../../lib/errors'

type Tab = 'single' | 'hdr'

export function RealEstateMode({ active = true }: { readonly active?: boolean }) {
  const { m } = useI18n()
  const api = useImageHistory()
  const [tab, setTab] = useState<Tab>('single')
  const [fileName, setFileName] = useState('room')
  const [picking, setPicking] = useState(false)
  const [whiteBalance, setWhiteBalance] = useState(true)
  const [highlight, setHighlight] = useState(0.5)
  const [clahe, setClahe] = useState(true)
  const [hdrBusy, setHdrBusy] = useState(false)
  const disabled = !api.currentBlob || !!api.busy || hdrBusy
  useUndoShortcuts(active && !!api.history && !api.busy, api.undo, api.redo)

  const autoVertical = () =>
    api.apply({ key: 'autoVertical' }, async (blob) => {
      const res = await postImage('/api/realestate/auto-vertical', { files: { file: blob } })
      if (res.headers.get('x-picedit-applied') !== 'true') throw new AppError('no_verticals')
      return res.blob
    })

  const manual = (points: readonly Point[]) => {
    setPicking(false)
    void api.apply({ key: 'manualPerspective' }, async (blob) => {
      const res = await postImage('/api/realestate/perspective', {
        files: { file: blob },
        fields: { points: JSON.stringify(points) },
      })
      return res.blob
    })
  }

  const finish = () =>
    api.apply({ key: 'finish' }, async (blob) => {
      const res = await postImage('/api/realestate/finish', {
        files: { file: blob },
        fields: { white_balance: whiteBalance, highlight, clahe },
      })
      return res.blob
    })

  const { reset, setError, clearError } = api
  const mergeHdr = useCallback(
    async (files: File[]) => {
      if (files.length < 2) {
        setError(new AppError('hdr_count', { min: 2, max: 5 }))
        return
      }
      setHdrBusy(true)
      clearError()
      try {
        const res = await postImage('/api/realestate/hdr', { files: { files } })
        setFileName(files[0].name)
        reset(res.blob, { key: 'hdr', count: files.length })
        setTab('single')
      } catch (err) {
        setError(err)
      } finally {
        setHdrBusy(false)
      }
    },
    [reset, setError, clearError],
  )

  const onSingle = useCallback(
    ([file]: File[]) => {
      setFileName(file.name)
      setPicking(false)
      reset(file)
    },
    [reset],
  )
  const onHdr = useCallback((files: File[]) => void mergeHdr(files), [mergeHdr])

  return (
    <div className="mode">
      <div className="mode__upload">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'single'} onClick={() => setTab('single')}>
            {m.realestate.tabSingle}
          </button>
          <button role="tab" aria-selected={tab === 'hdr'} onClick={() => setTab('hdr')}>
            {m.realestate.tabHdr}
          </button>
        </div>
        {tab === 'single' ? (
          <Uploader label={m.realestate.upload} onFiles={onSingle} onError={setError} />
        ) : (
          <Uploader label={m.realestate.uploadHdr} multiple maxFiles={5} onFiles={onHdr} onError={setError} />
        )}
      </div>

      <DropZone
        className="mode__main"
        multiple={tab === 'hdr'}
        maxFiles={tab === 'hdr' ? 5 : 1}
        onFiles={tab === 'hdr' ? onHdr : onSingle}
        onError={setError}
      >
        <StatusBar
          busy={api.busy ? stepText(api.busy, m) : hdrBusy ? m.realestate.busyHdr : null}
          error={api.error}
          onDismiss={clearError}
        />
        {!api.currentBlob && <p className="empty">{m.realestate.empty}</p>}
        {picking && api.currentBlob ? (
          <PointPicker imageUrl={api.urlFor(api.currentBlob)} onConfirm={manual} onCancel={() => setPicking(false)} />
        ) : (
          <ResultView api={api} fileName={fileName} suffix="finished" />
        )}
      </DropZone>

      <div className="mode__controls">
        <section className="panel" aria-label={m.realestate.correction}>
          <h3>{m.realestate.correction}</h3>
          <div className="button-grid">
            <button type="button" onClick={() => void autoVertical()} disabled={disabled}>
              {m.realestate.autoVertical}
            </button>
            <button type="button" onClick={() => setPicking(true)} disabled={disabled}>
              {m.realestate.manual}
            </button>
          </div>
          <h3>{m.realestate.tone}</h3>
          <label className="field field--inline">
            <input type="checkbox" checked={whiteBalance} onChange={(e) => setWhiteBalance(e.target.checked)} />
            <span>{m.realestate.whiteBalance}</span>
          </label>
          <label className="field">
            <span>{m.realestate.highlight(Math.round(highlight * 100))}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={highlight}
              onChange={(e) => setHighlight(Number(e.target.value))}
            />
          </label>
          <label className="field field--inline">
            <input type="checkbox" checked={clahe} onChange={(e) => setClahe(e.target.checked)} />
            <span>{m.realestate.clahe}</span>
          </label>
          <button type="button" className="primary" onClick={() => void finish()} disabled={disabled}>
            {m.realestate.applyFinish}
          </button>
        </section>
        <AdSlot name="sidebar" desktopOnly />
      </div>
    </div>
  )
}
