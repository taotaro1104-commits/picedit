// Amazon アソシエイト・楽天アフィリエイトのリンク生成とモード別おすすめ機材。
import { AMAZON_ASSOCIATE_TAG, RAKUTEN_AFFILIATE_ID } from '../config/monetization'
import type { Messages } from '../i18n/messages/ja'
import type { ModeId } from '../routing'

export type GearId = keyof Messages['gear']['items']

export interface GearItem {
  readonly id: GearId
  /** 日本のストアで検索するキーワード（どの言語でも日本語で検索する） */
  readonly keyword: string
}

// 楽天のテキストリンク形式（管理画面で発行されたリンクと同じ ut パラメータ）
const RAKUTEN_UT =
  'eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9'

export function amazonSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ k: keyword })
  if (AMAZON_ASSOCIATE_TAG) params.set('tag', AMAZON_ASSOCIATE_TAG)
  return `https://www.amazon.co.jp/s?${params.toString()}`
}

export function rakutenAffiliateUrl(targetUrl: string): string {
  if (!RAKUTEN_AFFILIATE_ID) return targetUrl // ID 未設定ならアフィリエイト無しの通常リンク
  const params = new URLSearchParams({ pc: targetUrl, link_type: 'text', ut: RAKUTEN_UT })
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?${params.toString()}`
}

export function rakutenSearchUrl(keyword: string): string {
  return rakutenAffiliateUrl(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`)
}

export const RAKUTEN_TOP_URL = rakutenAffiliateUrl('https://www.rakuten.co.jp/')

export const GEAR_BY_MODE: Record<ModeId, readonly GearItem[]> = {
  ec: [
    { id: 'lightbox', keyword: '撮影ボックス LED' },
    { id: 'backdrop', keyword: '撮影 背景シート 白' },
    { id: 'ledLight', keyword: '撮影用 LEDライト' },
    { id: 'phoneTripod', keyword: 'スマホ 三脚' },
  ],
  realestate: [
    { id: 'wideLens', keyword: 'スマホ 広角レンズ' },
    { id: 'tripod', keyword: 'カメラ 三脚' },
    { id: 'levelBubble', keyword: 'カメラ 水準器' },
    { id: 'ledLight', keyword: '撮影用 LEDライト' },
  ],
  restore: [
    { id: 'photoScanner', keyword: 'フォトスキャナー' },
    { id: 'filmScanner', keyword: 'フィルムスキャナー' },
    { id: 'albumSleeve', keyword: 'アルバム 中性紙' },
    { id: 'photoPrinter', keyword: 'フォトプリンター' },
  ],
}
