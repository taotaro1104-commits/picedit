// 広告・アクセス解析・アフィリエイトの ID。
// 値はソースに持たず、ビルド時の環境変数（web/.env.production.local など）から読み込む。
// 未設定なら該当機能は無効になる（広告・計測タグ・アフィリエイトタグを出さない）。
// 設定例は web/.env.production.local.example を参照。

export const GA_MEASUREMENT_ID: string = import.meta.env.VITE_GA_MEASUREMENT_ID ?? ''
export const ADSENSE_CLIENT: string = import.meta.env.VITE_ADSENSE_CLIENT ?? ''

export interface AdSlotConfig {
  readonly slot: string
  readonly format: 'auto' | 'fluid' | 'autorelaxed'
  readonly layout?: string
  readonly layoutKey?: string
  readonly fullWidthResponsive?: boolean
  /** レイアウトのずれ（CLS）を防ぐための最小高さ(px) */
  readonly minHeight: number
}

export const AD_SLOTS = {
  // サイドバー 300x250（PC のみ）
  sidebar: { slot: '9189081571', format: 'auto', fullWidthResponsive: true, minHeight: 250 },
  // 関連コンテンツ（ページ下部）
  multiplex: { slot: '3752662578', format: 'autorelaxed', minHeight: 280 },
  // 記事内（使い方とFAQの間）
  inArticle: { slot: '2324160796', format: 'fluid', layout: 'in-article', minHeight: 120 },
  // インフィード（おすすめ機材の一覧内）
  inFeed: { slot: '6705891600', format: 'fluid', layoutKey: '-fb+5w+4e-db+86', minHeight: 120 },
} as const satisfies Record<string, AdSlotConfig>

export type AdSlotName = keyof typeof AD_SLOTS

export const AMAZON_ASSOCIATE_TAG: string = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG ?? ''
export const RAKUTEN_AFFILIATE_ID: string = import.meta.env.VITE_RAKUTEN_AFFILIATE_ID ?? ''
