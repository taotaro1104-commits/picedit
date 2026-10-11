// 対応言語。URL の先頭セグメント（/ja/ など）と hreflang に使う。

export const LOCALES = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'ja'

export interface LocaleMeta {
  /** 言語切り替えメニューに出す自言語名 */
  readonly nativeName: string
  /** <html lang> と hreflang の値 */
  readonly htmlLang: string
  /** Open Graph の og:locale */
  readonly ogLocale: string
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  ja: { nativeName: '日本語', htmlLang: 'ja', ogLocale: 'ja_JP' },
  en: { nativeName: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  'zh-CN': { nativeName: '简体中文', htmlLang: 'zh-Hans', ogLocale: 'zh_CN' },
  'zh-TW': { nativeName: '繁體中文', htmlLang: 'zh-Hant', ogLocale: 'zh_TW' },
  ko: { nativeName: '한국어', htmlLang: 'ko', ogLocale: 'ko_KR' },
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/** Accept-Language / navigator.languages から最適な言語を選ぶ。 */
export function negotiateLocale(preferred: readonly string[]): Locale {
  for (const raw of preferred) {
    const tag = raw.toLowerCase()
    if (tag.startsWith('zh')) {
      return /tw|hk|mo|hant/.test(tag) ? 'zh-TW' : 'zh-CN'
    }
    const base = tag.split('-')[0]
    const match = LOCALES.find((l) => l.toLowerCase() === base)
    if (match) return match
  }
  return DEFAULT_LOCALE
}
