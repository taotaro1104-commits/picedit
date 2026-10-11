// ビルド時のプリレンダリング用エントリー（scripts/prerender.mjs から読み込む）。
/* eslint-disable react/only-export-components -- SSR 専用エントリー（HMR 対象外） */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import type { Route } from './routing'

export { LOCALE_META } from './i18n/locales'
export { renderHeadHtml } from './lib/seo'
export { allRoutes, buildPath } from './routing'

export function render(route: Route | null, path: string): string {
  return renderToString(
    <StrictMode>
      <App initialRoute={route} initialPath={path} />
    </StrictMode>,
  )
}
