import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useDocumentHead } from '../hooks/useDocumentHead'
import { useUndoShortcuts } from '../hooks/useUndoShortcuts'
import { I18nContext, MESSAGES } from '../i18n/context'
import { AdSlot } from './AdSlot'
import { DropZone } from './Uploader'

describe('AdSlot', () => {
  it('renders a labelled placeholder in development', () => {
    render(<AdSlot name="inArticle" />)
    expect(screen.getByLabelText('スポンサーリンク')).toBeInTheDocument()
    expect(screen.getByTestId('ad-inArticle')).toHaveTextContent('2324160796')
  })

  it('hides desktop-only slots on narrow screens', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ ...original(q), matches: false })) as typeof window.matchMedia
    render(<AdSlot name="sidebar" desktopOnly />)
    expect(screen.queryByTestId('ad-sidebar')).toBeNull()
    window.matchMedia = original
  })

  it('uses the current language for the label', () => {
    render(
      <I18nContext.Provider value={{ locale: 'en', m: MESSAGES.en }}>
        <AdSlot name="multiplex" />
      </I18nContext.Provider>,
    )
    expect(screen.getByLabelText('Sponsored')).toBeInTheDocument()
  })
})

describe('useUndoShortcuts', () => {
  it('maps Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y and ignores form fields', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoShortcuts(true, undo, redo))
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'y', metaKey: true })
    fireEvent.keyDown(window, { key: 'z' })
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(2)
    input.remove()
  })

  it('does nothing when disabled', () => {
    const undo = vi.fn()
    renderHook(() => useUndoShortcuts(false, undo, vi.fn()))
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(undo).not.toHaveBeenCalled()
  })
})

describe('DropZone', () => {
  it('shows an overlay while dragging files and accepts the drop', async () => {
    const onFiles = vi.fn()
    render(
      <DropZone onFiles={onFiles} onError={vi.fn()}>
        <p>作業エリア</p>
      </DropZone>,
    )
    const zone = screen.getByText('作業エリア').parentElement!
    const file = new File([new Uint8Array(4)], 'a.png', { type: 'image/png' })
    const dataTransfer = { types: ['Files'], files: [file] }
    fireEvent.dragOver(zone, { dataTransfer })
    expect(screen.getByText('ここにドロップして追加')).toBeInTheDocument()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer })
    })
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(screen.queryByText('ここにドロップして追加')).toBeNull()
  })

  it('ignores non-file drags', () => {
    render(
      <DropZone onFiles={vi.fn()} onError={vi.fn()}>
        <p>作業エリア</p>
      </DropZone>,
    )
    fireEvent.dragOver(screen.getByText('作業エリア').parentElement!, { dataTransfer: { types: ['text/plain'] } })
    expect(screen.queryByText('ここにドロップして追加')).toBeNull()
  })
})

describe('useDocumentHead', () => {
  it('updates title, lang, description, canonical and hreflang', () => {
    renderHook(() => useDocumentHead({ locale: 'zh-TW', page: 'realestate' }, 'x'))
    expect(document.title).toMatch('房地產')
    expect(document.documentElement.lang).toBe('zh-Hant')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch('物件照片')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch('/zh-TW/real-estate/')
    expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(6)
  })

  it('sets a not-found title', () => {
    renderHook(() => useDocumentHead(null, 'Page not found'))
    expect(document.title).toBe('Page not found - picedit')
  })
})
