import { loadAdsenseScript } from './adsense'

vi.mock('../config/monetization', () => ({ ADSENSE_CLIENT: 'ca-pub-0000000000000000' }))

describe('loadAdsenseScript', () => {
  it('injects the AdSense script once, after the page is idle', async () => {
    vi.useFakeTimers()
    const doc = document.implementation.createHTMLDocument('t')
    Object.defineProperty(doc, 'readyState', { value: 'complete' })
    loadAdsenseScript(doc)
    loadAdsenseScript(doc)
    await vi.advanceTimersByTimeAsync(3000)
    const scripts = doc.head.querySelectorAll('script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toContain('adsbygoogle.js?client=ca-pub-0000000000000000')
    expect(scripts[0].async).toBe(true)
    vi.useRealTimers()
  })
})
