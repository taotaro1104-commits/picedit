import { useCallback, useEffect, useState } from 'react'
import { AdSlot } from '../../components/AdSlot'
import { MaskBrush } from '../../components/MaskBrush'
import { ResultView } from '../../components/ResultView'
import { StatusBar } from '../../components/StatusBar'
import { DropZone, Uploader } from '../../components/Uploader'
import { stepText, useImageHistory, type StepKey } from '../../hooks/useImageHistory'
import { useUndoShortcuts } from '../../hooks/useUndoShortcuts'
import { useI18n } from '../../i18n/context'
import { fetchHealth, postImage, type AiStatus } from '../../lib/apiClient'
import { blobToMask, loadBitmap, maskToBlob } from '../../lib/canvas'
import type { MaskData } from '../../lib/compose'
import { AiPanel, type AiTask } from './AiPanel'

interface ScratchEdit {
  readonly bitmap: ImageBitmap
  readonly mask: MaskData
}

export function RestoreMode({ active = true }: { readonly active?: boolean }) {
  const { m } = useI18n()
  const api = useImageHistory()
  const [fileName, setFileName] = useState('photo')
  const [sensitivity, setSensitivity] = useState(0.5)
  const [scratch, setScratch] = useState<ScratchEdit | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [ai, setAi] = useState<AiStatus>({ available: false, provider: 'none' })
  const disabled = !api.currentBlob || !!api.busy || detecting
  useUndoShortcuts(active && !!api.history && !api.busy && !scratch, api.undo, api.redo)

  useEffect(() => {
    void fetchHealth().then(setAi)
  }, [])

  const closeScratch = useCallback(() => {
    setScratch((prev) => {
      prev?.bitmap.close?.()
      return null
    })
  }, [])

  const fade = () =>
    api.apply({ key: 'fade' }, async (blob) => (await postImage('/api/restore/fade', { files: { file: blob } })).blob)

  const detect = async () => {
    if (!api.currentBlob) return
    setDetecting(true)
    api.clearError()
    try {
      const res = await postImage('/api/restore/scratch-mask', {
        files: { file: api.currentBlob },
        fields: { sensitivity },
      })
      const [bitmap, mask] = await Promise.all([loadBitmap(api.currentBlob), blobToMask(res.blob)])
      setScratch({ bitmap, mask })
    } catch (err) {
      api.setError(err)
    } finally {
      setDetecting(false)
    }
  }

  const inpaint = async () => {
    if (!scratch) return
    const maskBlob = await maskToBlob(scratch.mask)
    const ok = await api.apply({ key: 'inpaint' }, async (blob) => {
      const res = await postImage('/api/restore/inpaint', { files: { file: blob, mask: maskBlob } })
      return res.blob
    })
    if (ok) closeScratch()
  }

  const runAi = (task: AiTask, step: StepKey, strength: number) =>
    api.apply({ key: step }, async (blob) => {
      const res = await postImage(`/api/restore/ai/${task}`, { files: { file: blob }, fields: { strength } })
      return res.blob
    })

  const { reset, setError, clearError } = api
  const onFiles = useCallback(
    ([file]: File[]) => {
      setFileName(file.name)
      closeScratch()
      reset(file)
    },
    [reset, closeScratch],
  )

  return (
    <div className="mode">
      <div className="mode__upload">
        <Uploader label={m.restore.upload} onFiles={onFiles} onError={setError} />
      </div>

      <DropZone className="mode__main" onFiles={onFiles} onError={setError}>
        <StatusBar
          busy={api.busy ? stepText(api.busy, m) : detecting ? m.restore.busyDetect : null}
          error={api.error}
          onDismiss={clearError}
        />
        {!api.currentBlob && <p className="empty">{m.restore.empty}</p>}
        {scratch ? (
          <>
            <p className="hint">{m.restore.maskHint}</p>
            <MaskBrush
              bitmap={scratch.bitmap}
              mask={scratch.mask}
              highlight="high"
              paintLabel={m.restore.maskAdd}
              eraseLabel={m.restore.maskExclude}
              onChange={(mask) => setScratch({ ...scratch, mask })}
            />
          </>
        ) : (
          <ResultView api={api} fileName={fileName} suffix="restored" />
        )}
      </DropZone>

      <div className="mode__controls">
        <section className="panel" aria-label={m.restore.basics}>
          <h3>{m.restore.fadeHeading}</h3>
          <button type="button" onClick={() => void fade()} disabled={disabled}>
            {m.restore.fade}
          </button>
          <h3>{m.restore.scratchHeading}</h3>
          <label className="field">
            <span>{m.restore.sensitivity(Math.round(sensitivity * 100))}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={() => void detect()} disabled={disabled}>
            {m.restore.detect}
          </button>
          {scratch && (
            <div className="toolbar">
              <button type="button" className="primary" onClick={() => void inpaint()} disabled={!!api.busy}>
                {m.restore.inpaint}
              </button>
              <button type="button" onClick={closeScratch}>
                {m.common.cancel}
              </button>
            </div>
          )}
        </section>
        <AiPanel ai={ai} disabled={disabled || !!scratch} onRun={(t, s, v) => void runAi(t, s, v)} />
        <AdSlot name="sidebar" desktopOnly />
      </div>
    </div>
  )
}
