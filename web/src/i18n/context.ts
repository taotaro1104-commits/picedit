import { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, type Locale } from './locales'
import { en } from './messages/en'
import { ja, type Messages } from './messages/ja'
import { ko } from './messages/ko'
import { zhCN } from './messages/zhCN'
import { zhTW } from './messages/zhTW'

export const MESSAGES: Record<Locale, Messages> = { ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW, ko }

export interface I18n {
  readonly locale: Locale
  readonly m: Messages
}

export const I18nContext = createContext<I18n>({ locale: DEFAULT_LOCALE, m: ja })

export const useI18n = (): I18n => useContext(I18nContext)
