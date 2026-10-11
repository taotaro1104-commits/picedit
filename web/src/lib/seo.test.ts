import { buildHeadData, renderHeadHtml } from './seo'

const SITE = 'https://picedit.example/'

describe('buildHeadData', () => {
  it('builds canonical and hreflang alternates for every locale', () => {
    const d = buildHeadData({ locale: 'en', page: 'restore' }, SITE)
    expect(d.canonical).toBe('https://picedit.example/en/photo-restoration/')
    expect(d.htmlLang).toBe('en')
    expect(d.alternates.map((a) => a.hreflang)).toEqual(['ja', 'en', 'zh-Hans', 'zh-Hant', 'ko', 'x-default'])
    expect(d.alternates.find((a) => a.hreflang === 'ko')?.href).toBe('https://picedit.example/ko/photo-restoration/')
    expect(d.alternates.at(-1)?.href).toBe('https://picedit.example/ja/photo-restoration/')
  })

  it('points x-default of the top page to the language-negotiating root', () => {
    const d = buildHeadData({ locale: 'ja', page: 'ec' }, SITE)
    expect(d.alternates.at(-1)).toEqual({ hreflang: 'x-default', href: 'https://picedit.example/' })
  })

  it('includes WebApplication, FAQPage and HowTo for tool pages only', () => {
    const types = (page: 'ec' | 'privacy') =>
      buildHeadData({ locale: 'ja', page }, SITE).jsonLd.map((o) => (o as { '@type': string })['@type'])
    expect(types('ec')).toEqual(['BreadcrumbList', 'WebApplication', 'FAQPage', 'HowTo'])
    expect(types('privacy')).toEqual(['BreadcrumbList'])
  })

  it('keeps titles and descriptions within SEO-friendly lengths', () => {
    for (const locale of ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'] as const) {
      for (const page of ['ec', 'realestate', 'restore', 'privacy'] as const) {
        const d = buildHeadData({ locale, page }, SITE)
        expect(d.title.length).toBeLessThanOrEqual(75)
        expect(d.description.length).toBeGreaterThan(20)
        expect(d.description.length).toBeLessThanOrEqual(160)
      }
    }
  })
})

describe('renderHeadHtml', () => {
  it('escapes HTML and embeds JSON-LD safely', () => {
    const html = renderHeadHtml({ locale: 'ja', page: 'ec' }, SITE)
    expect(html).toContain('<link rel="canonical" href="https://picedit.example/ja/" />')
    expect(html).toContain('og:image" content="https://picedit.example/og-image.png"')
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).not.toMatch(/<\/script><script>alert/)
    expect(html.match(/<title>/g)).toHaveLength(1)
  })
})
