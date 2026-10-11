// ビルド後に全ページ（5言語 × 4ページ）の HTML を事前生成する。
// 検索エンジンが JavaScript を実行しなくても、タイトル・本文・hreflang・構造化データを読めるようにする。
//
// 使い方: SITE_URL=https://example.com npm run build
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

// SITE_URL（環境変数）> web/.env.production の VITE_SITE_URL の順で使う
function siteUrlFromEnvFile() {
  try {
    const text = readFileSync(join(root, '.env.production'), 'utf8')
    return text.match(/^VITE_SITE_URL=(.+)$/m)?.[1].trim() ?? ''
  } catch {
    return ''
  }
}
const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || siteUrlFromEnvFile()).replace(/\/+$/, '')
if (!configured) {
  console.warn('[prerender] SITE_URL が未設定です。canonical / sitemap に https://example.com を使います。')
}
const site = configured || 'https://example.com'

const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
const { render, renderHeadHtml, allRoutes, buildPath, LOCALE_META } = ssr

const template = readFileSync(join(dist, 'index.html'), 'utf8')
if (!template.includes('<!--app-head-->') || !template.includes('<!--app-html-->')) {
  throw new Error('index.html にプレースホルダーがありません（prerender を二重に実行していませんか）')
}

function renderPage(route, path, head) {
  const lang = route ? LOCALE_META[route.locale].htmlLang : 'ja'
  return template
    .replace('<html lang="ja">', `<html lang="${lang}">`)
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', render(route, path))
}

function write(relPath, content) {
  const out = join(dist, relPath)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, content)
}

const routes = allRoutes()
for (const route of routes) {
  const path = buildPath(route)
  write(join(path, 'index.html'), renderPage(route, path, renderHeadHtml(route, site)))
}

// "/" は .htaccess で言語別 URL にリダイレクトする。リダイレクトされない環境向けに日本語トップを置く
const top = { locale: 'ja', page: 'ec' }
write('index.html', renderPage(top, '/', renderHeadHtml(top, site)))

write(
  '404.html',
  renderPage(null, '/404', '<title>404 Not Found - picedit</title>\n    <meta name="robots" content="noindex" />'),
)

// サイトマップ（hreflang の相互リンク付き）
const today = new Date().toISOString().slice(0, 10)
const urlEntries = routes.map((route) => {
  const alternates = routes
    .filter((r) => r.page === route.page)
    .map(
      (r) =>
        `    <xhtml:link rel="alternate" hreflang="${LOCALE_META[r.locale].htmlLang}" href="${site}${buildPath(r)}" />`,
    )
    .join('\n')
  const priority = route.page === 'privacy' ? '0.3' : route.page === 'ec' ? '1.0' : '0.9'
  return `  <url>\n    <loc>${site}${buildPath(route)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n${alternates}\n  </url>`
})
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries.join('\n')}\n</urlset>\n`,
)

write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`)

rmSync(ssrDir, { recursive: true, force: true })
console.log(`[prerender] ${routes.length} pages + index / 404 / sitemap.xml / robots.txt (site: ${site})`)
