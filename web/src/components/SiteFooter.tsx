import { useI18n } from '../i18n/context'
import { LOCALE_META, LOCALES } from '../i18n/locales'
import { useNavigation } from '../navigation'
import { MODE_IDS } from '../routing'
import { Link } from './Link'
import { SisterSites } from './SisterSites'

export function SiteFooter() {
  const { m, locale } = useI18n()
  const { route } = useNavigation()
  return (
    <footer className="site-footer">
      <nav className="site-footer__nav" aria-label={m.nav.modes}>
        {MODE_IDS.map((id) => (
          <Link key={id} to={{ locale, page: id }}>
            {m.nav[id]}
          </Link>
        ))}
        <Link to={{ locale, page: 'privacy' }}>{m.footer.privacyLink}</Link>
      </nav>
      <nav className="site-footer__langs" aria-label={m.nav.language}>
        {LOCALES.map((l) => (
          <Link key={l} to={{ locale: l, page: route.page }} hrefLang={LOCALE_META[l].htmlLang} lang={LOCALE_META[l].htmlLang}>
            {LOCALE_META[l].nativeName}
          </Link>
        ))}
      </nav>
      <SisterSites />
      <p>{m.footer.privacyNote}</p>
      <p>
        {m.footer.adDisclosure} {m.footer.amazonDisclosure}
      </p>
      <p className="site-footer__copy">© 2026 picedit</p>
    </footer>
  )
}
