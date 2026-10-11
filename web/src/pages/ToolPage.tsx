import { AdSlot } from '../components/AdSlot'
import { GearRecommendations } from '../components/GearRecommendations'
import { ModeGuide } from '../components/ModeGuide'
import { useI18n } from '../i18n/context'
import { EcMode } from '../modes/ec/EcMode'
import { RealEstateMode } from '../modes/realestate/RealEstateMode'
import { RestoreMode } from '../modes/restore/RestoreMode'
import { MODE_IDS, type ModeId } from '../routing'

export interface ToolPageProps {
  readonly mode: ModeId
  /** 一度開いたモード。切り替えても作業状態が消えないよう保持する */
  readonly visited: ReadonlySet<ModeId>
  /** 広告を遷移ごとに読み込み直すためのキー */
  readonly pageKey: string
}

function ModeView({ id, active }: { readonly id: ModeId; readonly active: boolean }) {
  if (id === 'ec') return <EcMode />
  if (id === 'realestate') return <RealEstateMode active={active} />
  return <RestoreMode active={active} />
}

export function ToolPage({ mode, visited, pageKey }: ToolPageProps) {
  const { m } = useI18n()
  return (
    <>
      <div className="page-hero">
        <h1>{m.meta[mode].h1}</h1>
        <p className="page-hero__lead">{m.leads[mode]}</p>
      </div>
      <section className="tool" aria-label={m.common.tools}>
        {MODE_IDS.filter((id) => id === mode || visited.has(id)).map((id) => (
          <div key={id} hidden={id !== mode}>
            <ModeView id={id} active={id === mode} />
          </div>
        ))}
      </section>
      <div className="content-grid" key={pageKey}>
        <ModeGuide mode={mode} />
        <GearRecommendations mode={mode} />
      </div>
      <AdSlot name="multiplex" key={`multiplex-${pageKey}`} />
    </>
  )
}
