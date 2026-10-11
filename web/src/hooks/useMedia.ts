// クライアント判定・メディアクエリ（SSR/ハイドレーションで不一致が起きないよう useSyncExternalStore を使う）。
import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/** サーバー／ハイドレーション中は false、以降は true。 */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const DESKTOP_QUERY = '(min-width: 1024px)'
