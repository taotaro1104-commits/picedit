import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { useDocumentHead } from './hooks/useDocumentHead'
import { I18nContext, MESSAGES } from './i18n/context'
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n/locales'
import { NavigationContext } from './navigation'
import { NotFoundPage, PrivacyPage } from './pages/InfoPages'
import { ToolPage } from './pages/ToolPage'
import { buildPath, MODE_IDS, parsePath, type ModeId, type Route } from './routing'
import './App.css'

const isMode = (page: string): page is ModeId => (MODE_IDS as readonly string[]).includes(page)

/** 404 ページでも URL の先頭が言語なら、その言語で表示する。 */
function localeOfPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0] ?? ''
  return isLocale(first) ? first : DEFAULT_LOCALE
}

export interface AppProps {
  /** null はページが存在しない（404） */
  readonly initialRoute: Route | null
  /** 404 のときの言語判定用（SSR では location が無いため渡す） */
  readonly initialPath?: string
}

export default function App({ initialRoute, initialPath = '/' }: AppProps) {
  const [route, setRoute] = useState<Route | null>(initialRoute)
  const [visited, setVisited] = useState<ReadonlySet<ModeId>>(
    () => new Set(initialRoute && isMode(initialRoute.page) ? [initialRoute.page] : []),
  )

  const show = useCallback((next: Route | null) => {
    setRoute(next)
    if (next && isMode(next.page)) {
      const page = next.page
      setVisited((prev) => (prev.has(page) ? prev : new Set([...prev, page])))
    }
  }, [])

  const navigate = useCallback(
    (next: Route) => {
      const path = buildPath(next)
      if (path !== window.location.pathname) {
        window.history.pushState(null, '', `${path}${window.location.search}`)
      }
      show(next)
      window.scrollTo({ top: 0 })
    },
    [show],
  )

  useEffect(() => {
    const onPop = () => show(parsePath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [show])

  const locale = route?.locale ?? localeOfPath(initialPath)
  const i18n = useMemo(() => ({ locale, m: MESSAGES[locale] }), [locale])
  const nav = useMemo(() => ({ route: route ?? { locale, page: 'ec' as const }, navigate }), [route, locale, navigate])
  useDocumentHead(route, i18n.m.notFound.title)

  return (
    <I18nContext.Provider value={i18n}>
      <NavigationContext.Provider value={nav}>
        <a className="skip-link" href="#main">
          {i18n.m.nav.skipToContent}
        </a>
        <SiteHeader />
        <main id="main" className="page">
          {!route && <NotFoundPage />}
          {route?.page === 'privacy' && <PrivacyPage />}
          {route && isMode(route.page) && <ToolPage mode={route.page} visited={visited} pageKey={buildPath(route)} />}
        </main>
        <SiteFooter />
      </NavigationContext.Provider>
    </I18nContext.Provider>
  )
}
