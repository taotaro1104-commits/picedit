import { negotiateLocale } from './i18n/locales'
import { allRoutes, buildPath, parsePath } from './routing'

describe('routing', () => {
  it('builds and parses paths symmetrically', () => {
    for (const route of allRoutes()) {
      expect(parsePath(buildPath(route))).toEqual(route)
    }
  })

  it('uses the product page as each locale top', () => {
    expect(buildPath({ locale: 'en', page: 'ec' })).toBe('/en/')
    expect(buildPath({ locale: 'zh-TW', page: 'restore' })).toBe('/zh-TW/photo-restoration/')
  })

  it('handles root, unknown locales and unknown pages', () => {
    expect(parsePath('/')).toEqual({ locale: 'ja', page: 'ec' })
    expect(parsePath('/fr/')).toBeNull()
    expect(parsePath('/ja/unknown/')).toBeNull()
    expect(parsePath('/ja/privacy/extra/')).toBeNull()
    expect(parsePath('/ko/real-estate')).toEqual({ locale: 'ko', page: 'realestate' })
  })

  it('lists 5 locales x 4 pages', () => {
    expect(allRoutes()).toHaveLength(20)
  })
})

describe('negotiateLocale', () => {
  it('picks the best supported locale', () => {
    expect(negotiateLocale(['en-US', 'ja'])).toBe('en')
    expect(negotiateLocale(['zh-TW'])).toBe('zh-TW')
    expect(negotiateLocale(['zh-Hant-HK'])).toBe('zh-TW')
    expect(negotiateLocale(['zh'])).toBe('zh-CN')
    expect(negotiateLocale(['ko-KR'])).toBe('ko')
    expect(negotiateLocale(['fr', 'de'])).toBe('ja')
    expect(negotiateLocale([])).toBe('ja')
  })
})
