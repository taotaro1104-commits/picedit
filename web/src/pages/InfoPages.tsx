import { Link } from '../components/Link'
import { useI18n } from '../i18n/context'

export function PrivacyPage() {
  const { m } = useI18n()
  return (
    <article className="prose">
      <h1>{m.meta.privacy.h1}</h1>
      <p className="prose__meta">{m.privacy.updated}</p>
      {m.privacy.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          <p>{s.body}</p>
        </section>
      ))}
      <section>
        <h2>{m.footer.privacyLink}</h2>
        <p>
          {m.footer.adDisclosure} {m.footer.amazonDisclosure}
        </p>
      </section>
    </article>
  )
}

export function NotFoundPage() {
  const { m, locale } = useI18n()
  return (
    <article className="prose prose--center">
      <h1>{m.notFound.title}</h1>
      <p>
        <Link to={{ locale, page: 'ec' }}>{m.notFound.back}</Link>
      </p>
    </article>
  )
}
