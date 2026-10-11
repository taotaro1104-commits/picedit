import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const fixture = (name: string) => path.join(fixtures, name)

async function upload(page: Page, files: string | string[]) {
  await page.locator('[data-testid="file-input"]:visible').setInputFiles(files)
}

/** ページ内で画像を描画し、サイズと指定座標の色を返す。 */
async function inspectImage(page: Page, selector: string, x: number, y: number) {
  return page.locator(selector).evaluate(async (img: HTMLImageElement, [px, py]) => {
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const [r, g, b] = ctx.getImageData(px, py, 1, 1).data
    return { width: img.naturalWidth, height: img.naturalHeight, rgb: [r, g, b] }
  }, [x, y] as const)
}

test('EC: 背景除去 → Amazon 規定で書き出し', async ({ page }) => {
  await page.goto('/ja/?segmenter=simple')
  await upload(page, [fixture('product.png'), fixture('product.png')])

  const preview = page.getByTestId('ec-preview')
  await expect(preview).toBeVisible({ timeout: 30_000 })
  const info = await inspectImage(page, '[data-testid="ec-preview"]', 5, 5)
  expect(info.width).toBe(2000)
  expect(info.height).toBe(2000)
  expect(info.rgb).toEqual([255, 255, 255])

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'この写真を書き出し' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('product_amazon.jpg')

  await expect(page.getByText('完了')).toHaveCount(2)
  const [zip] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /すべてZIPで書き出し/ }).click(),
  ])
  expect(zip.suggestedFilename()).toBe('picedit_amazon.zip')

  // メルカリに切り替えるとサイズが変わる
  await page.getByRole('combobox').selectOption('mercari')
  await expect.poll(async () => (await inspectImage(page, '[data-testid="ec-preview"]', 0, 0)).width).toBe(1080)
})

test('不動産: 自動垂直補正 → 仕上げ → ダウンロード', async ({ page }) => {
  await page.goto('/ja/real-estate/')
  await upload(page, fixture('room.png'))
  await expect(page.getByRole('button', { name: '1. 元画像' })).toBeVisible()

  await page.getByRole('button', { name: '自動垂直補正' }).click()
  await expect(page.getByRole('button', { name: '2. 自動垂直補正' })).toBeVisible()

  await page.getByRole('button', { name: '仕上げを適用' }).click()
  await expect(page.getByRole('button', { name: '3. 明るさ・色の仕上げ' })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'この状態をダウンロード' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('room_finished.png')

  await page.getByRole('button', { name: '元に戻す' }).click()
  await expect(page.getByRole('button', { name: '2. 自動垂直補正' })).toHaveAttribute('aria-current', 'step')
})

test('不動産: HDR合成', async ({ page }) => {
  await page.goto('/ja/real-estate/')
  await page.getByRole('tab', { name: 'HDR合成' }).click()
  await upload(page, ['room_dark.jpg', 'room_normal.jpg', 'room_bright.jpg'].map(fixture))
  await expect(page.getByRole('button', { name: '1. HDR合成（3枚）' })).toBeVisible()
})

test('修復: 色あせ補正 → 傷検出 → 傷除去（AI は無効表示）', async ({ page }) => {
  await page.goto('/ja/photo-restoration/')
  await upload(page, fixture('old_photo.png'))
  await expect(page.getByRole('button', { name: '1. 元画像' })).toBeVisible()
  await expect(page.getByRole('button', { name: '高解像度化' })).toBeDisabled()

  await page.getByRole('button', { name: '色あせを補正' }).click()
  await expect(page.getByRole('button', { name: '2. 色あせ補正' })).toBeVisible()

  await page.getByRole('button', { name: '傷を検出' }).click()
  const overlay = page.getByTestId('mask-overlay')
  await expect(overlay).toBeVisible()
  const box = (await overlay.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 80, box.y + 40)
  await page.mouse.up()

  await page.getByRole('button', { name: 'マークした傷を除去' }).click()
  await expect(page.getByRole('button', { name: '3. 傷・折れ跡の除去' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('不正なファイルはエラー表示', async ({ page }) => {
  await page.goto('/ja/photo-restoration/')
  await page.locator('[data-testid="file-input"]:visible').setInputFiles({
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  })
  await expect(page.getByRole('alert')).toContainText('対応していない形式')
})

test('多言語: 言語を切り替えるとURL・見出し・lang属性が変わる', async ({ page }) => {
  await page.goto('/ja/real-estate/')
  await page.locator('.lang-switch summary').click()
  await page.locator('.lang-switch').getByRole('link', { name: '한국어' }).click()
  await expect(page).toHaveURL(/\/ko\/real-estate\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('부동산·실내 사진 자동 보정')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  await expect(page).toHaveTitle(/부동산/)
})

test('ルート / はブラウザの言語に合わせてリダイレクト', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'zh-TW' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/zh-TW\/$/)
  await context.close()
})

test.describe('モバイル表示', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('横スクロールが出ず、書き出しボタンが画面下部に固定される', async ({ page }) => {
    await page.goto('/ja/?segmenter=simple')
    await upload(page, fixture('product.png'))
    await expect(page.getByTestId('ec-preview')).toBeVisible({ timeout: 30_000 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const button = page.getByRole('button', { name: 'この写真を書き出し' })
    const box = (await button.boundingBox())!
    expect(box.y + box.height).toBeGreaterThan(844 - 80)
    expect(box.height).toBeGreaterThanOrEqual(44)
    // サイドバー広告はモバイルでは出さない
    await expect(page.getByTestId('ad-sidebar')).toHaveCount(0)
  })
})

test('PC表示: サイドバー広告枠と作業エリアの追従', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/ja/photo-restoration/')
  await expect(page.locator('[data-testid="ad-sidebar"]:visible')).toHaveCount(1)
  const position = await page.locator('.mode__main:visible').evaluate((el) => getComputedStyle(el).position)
  expect(position).toBe('sticky')
})
