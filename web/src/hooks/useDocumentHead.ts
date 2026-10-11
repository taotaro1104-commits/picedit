// クライアント側でページを切り替えたときに <head> を更新する（初回はプリレンダリング済み）。
import { useEffect } from 'react'
import { buildHeadData } from '../lib/seo'
import type { Route } from '../routing'

function siteUrl(): string {
  return import.meta.env.VITE_SITE_URL || window.location.origin
}

function upsert(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  apply(el)
}

export function useDocumentHead(route: Route | null, notFoundTitle: string): void {
  useEffect(() => {
    if (!route) {
      document.title = `${notFoundTitle} - picedit`
      return
    }
    const d = buildHeadData(route, siteUrl())
    document.title = d.title
    document.documentElement.lang = d.htmlLang
    upsert(
      'meta[name="description"]',
      () => Object.assign(document.createElement('meta'), { name: 'description' }),
      (el) => el.setAttribute('content', d.description),
    )
    upsert(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      (el) => el.setAttribute('href', d.canonical),
    )
    for (const alt of d.alternates) {
      upsert(
        `link[rel="alternate"][hreflang="${alt.hreflang}"]`,
        () => Object.assign(document.createElement('link'), { rel: 'alternate', hreflang: alt.hreflang }),
        (el) => el.setAttribute('href', alt.href),
      )
    }
  }, [route, notFoundTitle])
}
