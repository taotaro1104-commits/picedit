// ページごとの <head>（title / description / canonical / hreflang / OGP / 構造化データ）を作る。
// プリレンダリング（ビルド時）とクライアント側のページ遷移の両方で使う。
import { MESSAGES } from '../i18n/context'
import { LOCALE_META, LOCALES } from '../i18n/locales'
import { buildPath, MODE_IDS, type ModeId, type Route } from '../routing'

export const OG_IMAGE_PATH = '/og-image.png'

export interface HeadData {
  readonly title: string
  readonly description: string
  readonly canonical: string
  readonly htmlLang: string
  readonly alternates: readonly { hreflang: string; href: string }[]
  readonly jsonLd: readonly object[]
}

const trimSlash = (url: string) => url.replace(/\/+$/, '')

function isMode(page: Route['page']): page is ModeId {
  return (MODE_IDS as readonly string[]).includes(page)
}

export function buildHeadData(route: Route, siteUrl: string): HeadData {
  const base = trimSlash(siteUrl)
  const m = MESSAGES[route.locale]
  const meta = m.meta[route.page]
  const canonical = base + buildPath(route)
  const alternates = [
    ...LOCALES.map((locale) => ({
      hreflang: LOCALE_META[locale].htmlLang,
      href: base + buildPath({ locale, page: route.page }),
    })),
    // x-default はブラウザの言語で振り分ける "/" を指す
    { hreflang: 'x-default', href: route.page === 'ec' ? `${base}/` : base + buildPath({ locale: 'ja', page: route.page }) },
  ]

  const jsonLd: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'picedit', item: base + buildPath({ locale: route.locale, page: 'ec' }) },
        ...(route.page === 'ec' ? [] : [{ '@type': 'ListItem', position: 2, name: meta.h1, item: canonical }]),
      ],
    },
  ]
  if (isMode(route.page)) {
    const guide = m.guide[route.page]
    jsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: meta.h1,
        url: canonical,
        description: meta.description,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web browser',
        inLanguage: LOCALE_META[route.locale].htmlLang,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `${m.guide.howTo}: ${meta.h1}`,
        step: guide.steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
      },
    )
  }

  return {
    title: meta.title,
    description: meta.description,
    canonical,
    htmlLang: LOCALE_META[route.locale].htmlLang,
    alternates,
    jsonLd,
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// JSON-LD 内で </script> が閉じタグとして解釈されないようにする
const safeJson = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c')

/** プリレンダリング用の <head> 内 HTML。 */
export function renderHeadHtml(route: Route, siteUrl: string): string {
  const d = buildHeadData(route, siteUrl)
  const ogLocale = LOCALE_META[route.locale].ogLocale
  const image = trimSlash(siteUrl) + OG_IMAGE_PATH
  return [
    `<title>${escapeHtml(d.title)}</title>`,
    `<meta name="description" content="${escapeHtml(d.description)}" />`,
    `<link rel="canonical" href="${d.canonical}" />`,
    ...d.alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="picedit" />`,
    `<meta property="og:title" content="${escapeHtml(d.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(d.description)}" />`,
    `<meta property="og:url" content="${d.canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="${ogLocale}" />`,
    ...LOCALES.filter((l) => l !== route.locale).map(
      (l) => `<meta property="og:locale:alternate" content="${LOCALE_META[l].ogLocale}" />`,
    ),
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...d.jsonLd.map((o) => `<script type="application/ld+json">${safeJson(o)}</script>`),
  ].join('\n    ')
}
