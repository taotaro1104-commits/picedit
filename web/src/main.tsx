import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import { negotiateLocale } from './i18n/locales'
import { buildPath, parsePath } from './routing'
import './index.css'

const { pathname, search } = window.location
let route = parsePath(pathname)

// "/" はブラウザの言語に合わせた URL へ（通常は .htaccess が先にリダイレクトする）
const isRoot = pathname === '/' || pathname === '/index.html'
if (isRoot) {
  route = { locale: negotiateLocale(navigator.languages ?? [navigator.language]), page: 'ec' }
  window.history.replaceState(null, '', buildPath(route) + search)
}

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App initialRoute={route} initialPath={pathname} />
  </StrictMode>
)

// プリレンダリング済みの HTML があれば引き継ぐ。
// "/" と 404（共通の 404.html は日本語で生成されるが、URL の言語で表示し直す）は描き直す
if (container.firstElementChild && !isRoot && route !== null) {
  hydrateRoot(container, app)
} else {
  container.textContent = ''
  createRoot(container).render(app)
}
