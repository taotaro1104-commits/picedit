import { amazonSearchUrl, GEAR_BY_MODE, rakutenAffiliateUrl, RAKUTEN_TOP_URL, rakutenSearchUrl } from './affiliate'
import { MESSAGES } from '../i18n/context'

vi.mock('../config/monetization', async (orig) => ({
  ...(await orig<typeof import('../config/monetization')>()),
  AMAZON_ASSOCIATE_TAG: 'test-22',
  RAKUTEN_AFFILIATE_ID: 'aaaa.bbbb.cccc.dddd',
}))

describe('affiliate links', () => {
  it('builds an Amazon search URL with the associate tag', () => {
    const url = new URL(amazonSearchUrl('撮影ボックス LED'))
    expect(url.origin).toBe('https://www.amazon.co.jp')
    expect(url.searchParams.get('k')).toBe('撮影ボックス LED')
    expect(url.searchParams.get('tag')).toBe('test-22')
  })

  it('wraps target URLs with the Rakuten affiliate redirect', () => {
    const url = new URL(rakutenSearchUrl('フォトスキャナー'))
    expect(url.origin).toBe('https://hb.afl.rakuten.co.jp')
    expect(url.pathname).toBe('/hgc/aaaa.bbbb.cccc.dddd/')
    expect(url.searchParams.get('pc')).toBe(
      'https://search.rakuten.co.jp/search/mall/%E3%83%95%E3%82%A9%E3%83%88%E3%82%B9%E3%82%AD%E3%83%A3%E3%83%8A%E3%83%BC/',
    )
    expect(url.searchParams.get('link_type')).toBe('text')
  })

  it('keeps the provided Rakuten top link', () => {
    expect(RAKUTEN_TOP_URL).toBe(rakutenAffiliateUrl('https://www.rakuten.co.jp/'))
    expect(new URL(RAKUTEN_TOP_URL).searchParams.get('pc')).toBe('https://www.rakuten.co.jp/')
  })

  it('every gear item has a translated name in all locales', () => {
    for (const items of Object.values(GEAR_BY_MODE)) {
      expect(items.length).toBeGreaterThanOrEqual(3)
      for (const item of items) {
        for (const m of Object.values(MESSAGES)) expect(m.gear.items[item.id].name).toBeTruthy()
      }
    }
  })
})
