// AdSense スクリプトの遅延読み込み。
// head で同期的に読むと初回表示（LCP）が数秒遅れるため、ページ表示後のアイドル時に1回だけ読み込む。
// 読み込み前に push された広告枠は adsbygoogle 配列に溜まり、スクリプト到着後に処理される。
import { ADSENSE_CLIENT } from '../config/monetization'

const SCRIPT_ID = 'adsbygoogle-js'

function whenIdle(fn: () => void): void {
  const run = () => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500))
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
}

export function loadAdsenseScript(doc: Document = document): void {
  if (!ADSENSE_CLIENT || doc.getElementById(SCRIPT_ID)) return
  const marker = doc.createElement('meta')
  marker.id = SCRIPT_ID // 二重読み込み防止（アイドル待ちの間に複数の枠から呼ばれても1回だけ）
  doc.head.appendChild(marker)
  whenIdle(() => {
    const script = doc.createElement('script')
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    script.crossOrigin = 'anonymous'
    doc.head.appendChild(script)
  })
}
