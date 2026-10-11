import { useEffect, useRef } from 'react'
import { AD_SLOTS, ADSENSE_CLIENT, type AdSlotName } from '../config/monetization'
import { DESKTOP_QUERY, useIsClient, useMediaQuery } from '../hooks/useMedia'
import { useI18n } from '../i18n/context'
import { loadAdsenseScript } from '../lib/adsense'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export interface AdSlotProps {
  readonly name: AdSlotName
  /** PC だけで表示する（サイドバー広告など） */
  readonly desktopOnly?: boolean
  readonly className?: string
}

/**
 * Google AdSense の広告枠。
 * - 表示はクライアントのみ（プリレンダリング HTML には枠の高さだけ確保し、CLS を防ぐ）
 * - 開発環境・テストでは広告を読み込まず、配置確認用のプレースホルダーを出す
 * - 誤クリック防止のため、操作ボタンとは離れた位置にだけ置く（呼び出し側の責任）
 */
export function AdSlot({ name, desktopOnly = false, className = '' }: AdSlotProps) {
  const { m } = useI18n()
  const isClient = useIsClient()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const insRef = useRef<HTMLModElement>(null)
  const config = AD_SLOTS[name]
  const visible = isClient && (!desktopOnly || isDesktop)

  useEffect(() => {
    const ins = insRef.current
    if (!visible || !import.meta.env.PROD || !ins) return
    if (ins.dataset.adsbygoogleStatus) return // 既に配信済み
    const serve = () => {
      loadAdsenseScript()
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.warn('adsbygoogle push failed', err)
      }
    }
    // 画面に近づいてから配信する（モバイルでは広告が画面外にあり、初回表示を遅らせない）
    if (!('IntersectionObserver' in window)) {
      serve()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect()
          serve()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(ins.parentElement ?? ins)
    return () => observer.disconnect()
  }, [visible])

  if (import.meta.env.PROD && !ADSENSE_CLIENT) return null // ID 未設定の本番ビルドでは広告枠を出さない
  if (desktopOnly && isClient && !isDesktop) return null
  const style = { minHeight: config.minHeight }
  return (
    <aside className={`ad ad--${name} ${className}`} style={style} aria-label={m.common.adLabel}>
      <span className="ad__label">{m.common.adLabel}</span>
      {visible &&
        (import.meta.env.PROD ? (
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: 'block', ...(config.format === 'fluid' && 'layout' in config ? { textAlign: 'center' } : {}) }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={config.slot}
            data-ad-format={config.format}
            data-ad-layout={'layout' in config ? config.layout : undefined}
            data-ad-layout-key={'layoutKey' in config ? config.layoutKey : undefined}
            data-full-width-responsive={'fullWidthResponsive' in config ? 'true' : undefined}
          />
        ) : (
          <div className="ad__dev" data-testid={`ad-${name}`}>
            AdSense: {name} ({config.slot})
          </div>
        ))}
    </aside>
  )
}
