import { useI18n } from '../i18n/context'

const SISTER_SITES = [
  { key: 'webtool', href: 'https://webtool.matchinfo-rank.com/' },
  { key: 'seo', href: 'https://seo.matchinfo-rank.com/' },
  { key: 'aiTools', href: 'https://aitooldb.newlife-startup.com/' },
  { key: 'movie', href: 'https://movieedit.newlife-startup.com/' },
  { key: 'pdf', href: 'https://pdf.newlife-startup.com/' },
] as const

export function SisterSites() {
  const { m } = useI18n()
  return (
    <nav className="site-footer__sisters" aria-label={m.footer.sistersTitle}>
      <h2>{m.footer.sistersTitle}</h2>
      <ul className="site-footer__sister-list">
        {SISTER_SITES.map((site) => (
          <li key={site.key}>
            <a href={site.href}>{m.footer.sisterLinks[site.key]}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
