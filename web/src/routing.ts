// パスベースのルーティング: /{locale}/{page}/
// 各ページが固有の URL を持つことで、検索エンジンに言語別・機能別に登録される。
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from './i18n/locales'

export type PageId = 'ec' | 'realestate' | 'restore' | 'privacy'
export type ModeId = Exclude<PageId, 'privacy'>

export const MODE_IDS: readonly ModeId[] = ['ec', 'realestate', 'restore']
export const PAGE_IDS: readonly PageId[] = [...MODE_IDS, 'privacy']

// 商品写真モードを各言語のトップページにする
const SLUGS: Record<PageId, string> = {
  ec: '',
  realestate: 'real-estate',
  restore: 'photo-restoration',
  privacy: 'privacy',
}

export interface Route {
  readonly locale: Locale
  readonly page: PageId
}

export function buildPath(route: Route): string {
  const slug = SLUGS[route.page]
  return `/${route.locale}/${slug ? `${slug}/` : ''}`
}

/** 未知のパスは null（404）。ロケールが無いパスは既定言語として扱う。 */
export function parsePath(pathname: string): Route | null {
  const parts = pathname.split('/').filter(Boolean)
  const [first, second, ...rest] = parts
  if (!first) return { locale: DEFAULT_LOCALE, page: 'ec' }
  if (!isLocale(first) || rest.length > 0) return null
  const page = (Object.keys(SLUGS) as PageId[]).find((p) => SLUGS[p] === (second ?? ''))
  return page ? { locale: first, page } : null
}

/** プリレンダリング・サイトマップ用の全ルート。 */
export function allRoutes(): Route[] {
  return LOCALES.flatMap((locale) => PAGE_IDS.map((page) => ({ locale, page })))
}
