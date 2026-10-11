import { amazonSearchUrl, GEAR_BY_MODE, RAKUTEN_TOP_URL, rakutenSearchUrl } from '../lib/affiliate'
import { useI18n } from '../i18n/context'
import type { ModeId } from '../routing'
import { AdSlot } from './AdSlot'

const REL = 'nofollow sponsored noopener'

/** モード別のおすすめ機材（Amazon アソシエイト・楽天アフィリエイト）。ステマ規制に合わせ PR 表記を付ける。 */
export function GearRecommendations({ mode }: { readonly mode: ModeId }) {
  const { m } = useI18n()
  const items = GEAR_BY_MODE[mode]
  return (
    <section className="gear" aria-labelledby={`gear-${mode}`}>
      <h2 id={`gear-${mode}`}>
        {m.gear.heading} <span className="gear__pr">{m.gear.adLabel}</span>
      </h2>
      <ul className="gear__list">
        {items.flatMap((item, i) => [
          <li key={item.id} className="gear__item">
            <h3>{m.gear.items[item.id].name}</h3>
            <p>{m.gear.items[item.id].reason}</p>
            <div className="gear__links">
              <a href={amazonSearchUrl(item.keyword)} target="_blank" rel={REL} className="gear__link gear__link--amazon">
                {m.gear.amazon}
              </a>
              <a href={rakutenSearchUrl(item.keyword)} target="_blank" rel={REL} className="gear__link gear__link--rakuten">
                {m.gear.rakuten}
              </a>
            </div>
          </li>,
          // 2件目の後ろにインフィード広告（独立したカードとして表示）
          ...(i === 1
            ? [
                <li key="ad" className="gear__item gear__item--ad">
                  <AdSlot name="inFeed" />
                </li>,
              ]
            : []),
        ])}
      </ul>
      <p className="gear__note">
        {m.gear.note}{' '}
        <a href={RAKUTEN_TOP_URL} target="_blank" rel={REL} style={{ wordWrap: 'break-word' }}>
          {m.gear.rakutenTop}
        </a>
      </p>
    </section>
  )
}
