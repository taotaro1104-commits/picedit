import { AdSlot } from './AdSlot'
import { Link } from './Link'
import { useI18n } from '../i18n/context'
import { MODE_IDS, type ModeId } from '../routing'

type ReferenceKey = 'amazon' | 'rakuten' | 'transformers' | 'canvas' | 'replicate'

const REFERENCE_URLS: Record<ReferenceKey, string> = {
  amazon: 'https://sellercentral.amazon.co.jp/help/hub/reference/G1881',
  rakuten: 'https://www.rakuten.co.jp/ec/open/attention/pdf/disclosure/03_tempounei_guideline.pdf',
  transformers: 'https://huggingface.co/docs/transformers.js/en/index',
  canvas: 'https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D',
  replicate: 'https://replicate.com/docs/reference/http/',
}

const REFERENCES: Record<ModeId, readonly ReferenceKey[]> = {
  ec: ['amazon', 'rakuten', 'transformers'],
  realestate: ['canvas'],
  restore: ['replicate'],
}

/** 使い方と FAQ。検索エンジン向けの本文コンテンツも兼ねる（構造化データと同じ内容）。 */
export function ModeGuide({ mode }: { readonly mode: ModeId }) {
  const { m, locale } = useI18n()
  const guide = m.guide[mode]
  const related = MODE_IDS.filter((id) => id !== mode)
  const references = REFERENCES[mode]
  return (
    <article className="guide">
      <section aria-labelledby={`howto-${mode}`}>
        <h2 id={`howto-${mode}`}>{m.guide.howTo}</h2>
        <ol className="guide__steps">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby={`references-${mode}`}>
        <h2 id={`references-${mode}`}>{m.guide.officialTitle}</h2>
        <ul className="guide__resources">
          {references.map((key) => (
            <li key={key}>
              <a href={REFERENCE_URLS[key]} target="_blank" rel="noopener noreferrer">
                {m.guide.references[key]}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <AdSlot name="inArticle" />
      <section aria-labelledby={`faq-${mode}`}>
        <h2 id={`faq-${mode}`}>{m.guide.faq}</h2>
        <div className="guide__faq">
          {guide.faq.map(({ q, a }) => (
            <details key={q}>
              <summary>
                <h3>{q}</h3>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section aria-labelledby={`related-${mode}`}>
        <h2 id={`related-${mode}`}>{m.guide.relatedTitle}</h2>
        <ul className="guide__related">
          {related.map((id) => (
            <li key={id}>
              <Link to={{ locale, page: id }}>
                <strong>{m.nav[id]}</strong>: {m.leads[id]}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
