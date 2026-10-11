import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdSlot } from '../../components/AdSlot'
import { MaskBrush } from '../../components/MaskBrush'
import { StatusBar } from '../../components/StatusBar'
import { DropZone, Uploader } from '../../components/Uploader'
import { useI18n } from '../../i18n/context'
import { renderProduct } from '../../lib/canvas'
import { AppError } from '../../lib/errors'
import { buildFileName, canvasToBlob, createZip, downloadBlob } from '../../lib/export'
import { findPreset, MALL_PRESETS } from '../../lib/presets'
import { chooseSegmenterKind } from '../../lib/segmentation'
import { EcOptions } from './EcOptions'
import { settingsFromPreset, type EcSettings } from './settings'
import { useEcItems, type EcItem } from './useEcItems'

async function exportItem(item: EcItem, settings: EcSettings) {
  if (!item.bitmap || !item.mask) throw new AppError('not_segmented')
  const preset = findPreset(settings.presetId)
  const canvas = renderProduct(item.bitmap, item.mask, {
    width: preset.width,
    height: preset.height,
    background: settings.background,
    fillRatio: settings.fillRatio,
    shadow: settings.shadow,
  })
  const blob = await canvasToBlob(canvas, preset.format, preset.quality)
  return { name: buildFileName(item.file.name, preset.id, preset.format), blob }
}

const initialSegmenter = () =>
  typeof window === 'undefined' ? 'ai' : chooseSegmenterKind(window.location.search)

export function EcMode() {
  const { m } = useI18n()
  const ec = useEcItems(initialSegmenter())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<EcSettings>(() => settingsFromPreset(MALL_PRESETS[0]))
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState<{ item: EcItem; url: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const preset = findPreset(settings.presetId)
  const selected = useMemo(
    () => ec.items.find((it) => it.id === selectedId) ?? ec.items[0] ?? null,
    [ec.items, selectedId],
  )
  const readyItems = ec.items.filter((it) => it.status === 'ready')
  // 同じ商品なら新しいプレビューができるまで前の画像を表示し続ける（ちらつき防止）
  const previewUrl = preview && preview.item.id === selected?.id ? preview.url : null
  const previewRef = useRef(preview)
  useEffect(() => {
    previewRef.current = preview
  }, [preview])
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    },
    [],
  )

  // 選択中の商品のプレビューを、設定が変わるたびに描き直す
  useEffect(() => {
    if (!selected?.bitmap || !selected.mask) return
    let cancelled = false
    exportItem(selected, settings)
      .then(({ blob }) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev.url) // 置き換えた古い URL だけを解放する
          return { item: selected, url }
        })
      })
      .catch((err: unknown) => !cancelled && setError(err))
    return () => {
      cancelled = true
    }
  }, [selected, settings])

  const runExport = async (targets: readonly EcItem[]) => {
    setExporting(true)
    setError(null)
    try {
      const files = []
      for (const item of targets) files.push(await exportItem(item, settings))
      if (files.length === 1) downloadBlob(files[0].blob, files[0].name)
      else downloadBlob(await createZip(files), `picedit_${preset.id}.zip`)
    } catch (err) {
      setError(err)
    } finally {
      setExporting(false)
    }
  }

  const { addFiles } = ec
  const onFiles = useCallback(
    (files: File[]) => {
      const added = addFiles(files)
      setSelectedId((current) => current ?? added[0]?.id ?? null)
    },
    [addFiles],
  )

  const busy = exporting ? m.ec.busyExporting : ec.running ? m.ec.busySegmenting : null
  const failed = ec.items.some((it) => it.status === 'error')

  return (
    <div className="mode">
      <div className="mode__upload">
        <Uploader label={m.ec.upload} multiple onFiles={onFiles} onError={setError} />
        {ec.items.length > 0 && (
          <ul className="item-list" aria-label={m.ec.listLabel}>
            {ec.items.map((it) => (
              <li key={it.id} className={it.id === selected?.id ? 'is-selected' : ''}>
                <button type="button" onClick={() => setSelectedId(it.id)}>
                  <img src={it.thumbUrl} alt="" />
                  <span>{it.file.name}</span>
                  <span className={`badge badge--${it.status}`}>{m.ec.status[it.status]}</span>
                </button>
                <button
                  type="button"
                  className="icon"
                  aria-label={m.ec.remove(it.file.name)}
                  onClick={() => ec.removeItem(it.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {failed && (
          <button type="button" onClick={() => void ec.retry()} disabled={ec.running}>
            {m.ec.retryFailed}
          </button>
        )}
      </div>

      <DropZone className="mode__main" multiple onFiles={onFiles} onError={setError}>
        <StatusBar
          busy={busy}
          progress={ec.progress}
          error={error ?? selected?.error ?? null}
          notice={ec.usedFallback ? m.ec.fallbackNotice : null}
          onDismiss={() => setError(null)}
        />
        {!selected && <p className="empty">{m.ec.empty}</p>}
        {selected?.status === 'ready' && selected.bitmap && selected.mask && (
          <>
            <div className="toolbar">
              <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                {editing ? m.ec.backToPreview : m.ec.editMask}
              </button>
              <button
                type="button"
                className="primary primary-action"
                onClick={() => void runExport([selected])}
                disabled={exporting}
              >
                {m.ec.exportOne}
              </button>
              <button
                type="button"
                onClick={() => void runExport(readyItems)}
                disabled={exporting || readyItems.length < 2}
              >
                {m.ec.exportAll(readyItems.length)}
              </button>
            </div>
            {editing ? (
              <MaskBrush
                bitmap={selected.bitmap}
                mask={selected.mask}
                highlight="low"
                eraseLabel={m.ec.maskErase}
                paintLabel={m.ec.maskRestore}
                onChange={(mask) => ec.setMask(selected.id, mask)}
              />
            ) : (
              previewUrl && (
                <figure className="preview">
                  <img src={previewUrl} alt={m.ec.previewAlt} data-testid="ec-preview" />
                  <figcaption>
                    {m.presets[preset.id].label} / {preset.width}×{preset.height}px
                  </figcaption>
                </figure>
              )
            )}
          </>
        )}
      </DropZone>

      <div className="mode__controls">
        <EcOptions settings={settings} preset={preset} onChange={setSettings} />
        <AdSlot name="sidebar" desktopOnly />
      </div>
    </div>
  )
}
