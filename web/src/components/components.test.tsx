import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StepLabel } from '../hooks/useImageHistory'
import { AppError } from '../lib/errors'
import { createHistory, push } from '../lib/history'
import { BeforeAfter } from './BeforeAfter'
import { HistoryPanel } from './HistoryPanel'
import { PointPicker } from './PointPicker'
import { StatusBar } from './StatusBar'
import { validateFiles } from '../lib/uploadRules'
import { Uploader } from './Uploader'

const png = (name = 'a.png', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('validateFiles', () => {
  it('accepts valid files', () => {
    expect(validateFiles([png()], 1)).toBeNull()
    expect(validateFiles([], 1)).toBeNull()
  })

  it('rejects too many, wrong type and too large with error codes', () => {
    expect(validateFiles([png(), png()], 1)).toMatchObject({ code: 'too_many_files', params: { max: 1 } })
    expect(validateFiles([new File(['x'], 'a.pdf', { type: 'application/pdf' })], 1)).toMatchObject({
      code: 'bad_file_type',
      params: { name: 'a.pdf' },
    })
    const big = png('big.png')
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 })
    expect(validateFiles([big], 1)).toMatchObject({ code: 'bad_file_size' })
  })
})

describe('Uploader', () => {
  it('passes valid files to onFiles', async () => {
    const onFiles = vi.fn()
    render(<Uploader label="追加" onFiles={onFiles} onError={vi.fn()} />)
    await userEvent.upload(screen.getByTestId('file-input'), png())
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1))
    expect(onFiles.mock.calls[0][0][0].name).toBe('a.png')
  })

  it('reports validation errors', () => {
    const onError = vi.fn()
    render(<Uploader label="追加" onFiles={vi.fn()} onError={onError} />)
    fireEvent.drop(screen.getByText('追加').closest('label')!, {
      dataTransfer: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] },
    })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'bad_file_type' }))
  })
})

describe('BeforeAfter', () => {
  it('moves the clip position with the slider', () => {
    render(<BeforeAfter beforeUrl="b.png" afterUrl="a.png" alt="写真" />)
    fireEvent.change(screen.getByLabelText('比較位置'), { target: { value: '30' } })
    expect(screen.getByTestId('after-image').style.clipPath).toBe('inset(0 0 0 30%)')
  })
})

describe('HistoryPanel', () => {
  it('renders steps and wires buttons', async () => {
    const h = push(createHistory<Blob, StepLabel>({ label: { key: 'original' }, value: new Blob() }), {
      label: { key: 'fade' },
      value: new Blob(),
    })
    const onUndo = vi.fn()
    const onJump = vi.fn()
    render(<HistoryPanel history={h} disabled={false} onUndo={onUndo} onRedo={vi.fn()} onJump={onJump} />)
    expect(screen.getByRole('button', { name: 'やり直す' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    await userEvent.click(screen.getByRole('button', { name: '1. 元画像' }))
    expect(onUndo).toHaveBeenCalled()
    expect(onJump).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: '2. 色あせ補正' })).toHaveAttribute('aria-current', 'step')
  })
})

describe('StatusBar', () => {
  it('shows busy, progress, notice and error', async () => {
    const onDismiss = vi.fn()
    const { rerender } = render(
      <StatusBar busy="処理中" progress={40} error={null} notice="お知らせ" onDismiss={onDismiss} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('処理中')
    expect(screen.getByLabelText('進捗')).toHaveAttribute('value', '40')
    expect(screen.getByText('お知らせ')).toBeInTheDocument()
    rerender(<StatusBar busy={null} error={new AppError('ai_failed')} notice="お知らせ" onDismiss={onDismiss} />)
    expect(screen.queryByText('お知らせ')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('AI処理に失敗しました')
    await userEvent.click(screen.getByLabelText('エラーを閉じる'))
    expect(onDismiss).toHaveBeenCalled()
  })
})

describe('PointPicker', () => {
  it('collects four points in natural pixel coordinates', async () => {
    const onConfirm = vi.fn()
    render(<PointPicker imageUrl="x.png" onConfirm={onConfirm} onCancel={vi.fn()} />)
    const img = screen.getByTestId('point-picker-image') as HTMLImageElement
    Object.defineProperty(img, 'naturalWidth', { value: 1000 })
    Object.defineProperty(img, 'naturalHeight', { value: 500 })
    img.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 50 }) as DOMRect
    const confirm = screen.getByRole('button', { name: 'この4点で補正' })
    for (const [x, y] of [[10, 5], [90, 5], [90, 45], [10, 45], [50, 25]]) {
      fireEvent.click(img, { clientX: x, clientY: y })
    }
    expect(screen.getByText('4点を指定しました。')).toBeInTheDocument()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith([[100, 50], [900, 50], [900, 450], [100, 450]])
  })

  it('resets points', async () => {
    render(<PointPicker imageUrl="x.png" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const img = screen.getByTestId('point-picker-image')
    img.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 50 }) as DOMRect
    fireEvent.click(img, { clientX: 1, clientY: 1 })
    expect(screen.getByText(/1\/4/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'やり直す' }))
    expect(screen.getByText(/0\/4/)).toBeInTheDocument()
  })
})
