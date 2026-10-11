import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { findPreset } from '../lib/presets'
import { EcOptions } from './ec/EcOptions'
import { settingsFromPreset } from './ec/settings'
import { AiPanel } from './restore/AiPanel'

vi.mock('../config/monetization', async (orig) => ({
  ...(await orig<typeof import('../config/monetization')>()),
  AMAZON_ASSOCIATE_TAG: 'test-22',
  RAKUTEN_AFFILIATE_ID: 'aaaa.bbbb.cccc.dddd',
}))

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ai: { available: false, provider: 'none' } } })),
    ),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('EcOptions', () => {
  it('switching preset applies its size, fill and background', async () => {
    const onChange = vi.fn()
    const amazon = findPreset('amazon')
    render(<EcOptions settings={settingsFromPreset(amazon)} preset={amazon} onChange={onChange} />)
    expect(screen.getByLabelText(/背景色/)).toBeDisabled()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'mercari')
    expect(onChange).toHaveBeenCalledWith({ presetId: 'mercari', background: '#FFFFFF', fillRatio: 0.8, shadow: true })
  })

  it('amazon fill ratio slider cannot go below 85%', () => {
    const amazon = findPreset('amazon')
    render(<EcOptions settings={settingsFromPreset(amazon)} preset={amazon} onChange={vi.fn()} />)
    expect(screen.getByLabelText('商品の大きさ')).toHaveAttribute('min', '0.85')
  })

  it('toggles shadow', async () => {
    const onChange = vi.fn()
    const rakuten = findPreset('rakuten')
    render(<EcOptions settings={settingsFromPreset(rakuten)} preset={rakuten} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('接地影をつける'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shadow: false }))
  })
})

describe('AiPanel', () => {
  it('disables AI buttons when unavailable', () => {
    render(<AiPanel ai={{ available: false, provider: 'none' }} disabled={false} onRun={vi.fn()} />)
    expect(screen.getByRole('button', { name: '高解像度化' })).toBeDisabled()
    expect(screen.getByText(/AI機能は現在オフ/)).toBeInTheDocument()
  })

  it('runs a task with the chosen strength', async () => {
    const onRun = vi.fn()
    render(<AiPanel ai={{ available: true, provider: 'replicate' }} disabled={false} onRun={onRun} />)
    await userEvent.click(screen.getByRole('button', { name: '顔の復元' }))
    expect(onRun).toHaveBeenCalledWith('face_restore', 'faceRestore', 0.7)
  })
})

describe('App', () => {
  beforeEach(() => window.history.replaceState(null, '', '/ja/'))

  it('navigates between tool pages with real links and keeps visited modes mounted', async () => {
    render(<App initialRoute={{ locale: 'ja', page: 'ec' }} />)
    const nav = within(screen.getByRole('banner')).getByRole('navigation', { name: '機能' })
    expect(within(nav).getByRole('link', { name: '商品写真' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: '不動産・室内' })).toHaveAttribute('href', '/ja/real-estate/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('商品写真の背景除去')

    await userEvent.click(within(nav).getByRole('link', { name: '不動産・室内' }))
    expect(window.location.pathname).toBe('/ja/real-estate/')
    expect(screen.getByText(/室内写真をアップロードしてください/)).toBeVisible()
    expect(document.title).toMatch('不動産')

    await userEvent.click(within(nav).getByRole('link', { name: '古い写真の修復' }))
    expect(screen.getByText(/色あせ・傷のある写真/)).toBeVisible()
    // 一度開いた商品写真モードは非表示で保持される
    expect(screen.getByText(/商品写真をアップロードすると/)).not.toBeVisible()
  })

  it('switches language and keeps the page', async () => {
    render(<App initialRoute={{ locale: 'ja', page: 'restore' }} />)
    const menu = screen.getByText('日本語', { selector: 'summary *, summary' }).closest('details')!
    await userEvent.click(within(menu).getByRole('link', { name: 'English' }))
    expect(window.location.pathname).toBe('/en/photo-restoration/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Old Photo Restoration')
    expect(document.documentElement.lang).toBe('en')
  })

  it('handles browser back navigation', async () => {
    render(<App initialRoute={{ locale: 'ko', page: 'ec' }} />)
    await userEvent.click(screen.getAllByRole('link', { name: '개인정보처리방침' })[0])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('개인정보처리방침')
    act(() => {
      window.history.replaceState(null, '', '/ko/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('상품 사진')
  })

  it('renders a localized 404 for unknown pages', () => {
    render(<App initialRoute={null} initialPath="/zh-TW/nope/" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('找不到頁面')
  })

  it('shows affiliate links with the associate tag and PR label', () => {
    render(<App initialRoute={{ locale: 'ja', page: 'ec' }} />)
    const amazon = screen.getAllByRole('link', { name: 'Amazonで見る' })[0]
    expect(amazon.getAttribute('href')).toContain('tag=test-22')
    expect(amazon).toHaveAttribute('rel', 'nofollow sponsored noopener')
    expect(screen.getAllByText('Amazonのアソシエイトとして', { exact: false }).length).toBeGreaterThan(0)
  })
})
