import { useI18n } from '../i18n/context'
import { LOCALE_META, LOCALES } from '../i18n/locales'
import { useNavigation } from '../navigation'
import { MODE_IDS } from '../routing'
import { Link } from './Link'

/** 上部固定ヘッダー。PC では横並び、モバイルではモード切り替えが横スクロールのタブになる。 */
export function SiteHeader() {
  const { m, locale } = useI18n()
  const { route } = useNavigation()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to={{ locale, page: 'ec' }} className="brand" aria-label={m.nav.home}>
          pic<span>edit</span>
        </Link>
        <nav className="mode-nav" aria-label={m.nav.modes}>
          {MODE_IDS.map((id) => (
            <Link
              key={id}
              to={{ locale, page: id }}
              className="mode-nav__link"
              aria-current={route.page === id ? 'page' : undefined}
              title={m.leads[id]}
            >
              {m.nav[id]}
            </Link>
          ))}
        </nav>
        <details className="lang-switch">
          <summary aria-label={m.nav.language}>
            <span aria-hidden>🌐</span> {LOCALE_META[locale].nativeName}
          </summary>
          <ul>
            {LOCALES.map((l) => (
              <li key={l}>
                <Link
                  to={{ locale: l, page: route.page }}
                  hrefLang={LOCALE_META[l].htmlLang}
                  lang={LOCALE_META[l].htmlLang}
                  aria-current={l === locale ? 'true' : undefined}
                  onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}
                >
                  {LOCALE_META[l].nativeName}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </header>
  )
}
