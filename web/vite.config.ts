/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite'

const apiTarget = process.env.PICEDIT_API_URL ?? 'http://127.0.0.1:8000'

/**
 * 本番ビルドにだけ Google アナリティクスと AdSense のサイト確認タグを入れる。
 * 開発サーバー・E2E テストでは外部スクリプトを読み込まない（計測の汚染と誤クリックを防ぐ）。
 */
function monetizationTags(adsenseClient: string, gaId: string): Plugin {
  const tags: HtmlTagDescriptor[] = []
  if (adsenseClient) {
    tags.push(
      { tag: 'meta', attrs: { name: 'google-adsense-account', content: adsenseClient }, injectTo: 'head' },
      // adsbygoogle.js 本体は表示速度のため src/lib/adsense.ts でアイドル時に遅延読み込みする
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://pagead2.googlesyndication.com', crossorigin: '' }, injectTo: 'head' },
    )
  }
  if (gaId) {
    tags.push(
      // Google タグ（gtag.js）。dataLayer の初期化と config はすぐ実行し、
      // スクリプト本体はページ読み込み完了後に取得する（モバイルの初回表示を遅らせないため）。
      // 読み込み前のイベントは dataLayer に溜まり、到着後に送信される。
      {
        tag: 'script',
        children: [
          'window.dataLayer = window.dataLayer || [];',
          'function gtag(){dataLayer.push(arguments);}',
          "gtag('js', new Date());",
          `gtag('config', '${gaId}');`,
          "window.addEventListener('load', function () {",
          "  var s = document.createElement('script');",
          '  s.async = true;',
          `  s.src = 'https://www.googletagmanager.com/gtag/js?id=${gaId}';`,
          '  document.head.appendChild(s);',
          '});',
        ].join('\n'),
        injectTo: 'head',
      },
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://www.googletagmanager.com' }, injectTo: 'head' },
    )
  }
  return {
    name: 'picedit-monetization-tags',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: () => tags },
  }
}

export default defineConfig(({ mode }) => {
  // ID は .env.production.local など（gitignore 対象）から読む。未設定ならタグを出さない
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
  plugins: [react(), monetizationTags(env.VITE_ADSENSE_CLIENT ?? '', env.VITE_GA_MEASUREMENT_ID ?? '')],
  server: {
    proxy: { '/api': apiTarget },
  },
  preview: {
    proxy: { '/api': apiTarget },
  },
  worker: { format: 'es' },
  // 初回のワーカー読み込み時に依存再最適化→ページ再読み込みが起きないよう除外する
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  build: {
    // 大きな ONNX Runtime の wasm はワーカー側で遅延読み込みされるため警告の閾値を上げる
    chunkSizeWarningLimit: 800,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 20000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/entry-server.tsx',
        'src/**/*.worker.ts',
        'src/**/*.d.ts',
      ],
    },
  },
}
})
