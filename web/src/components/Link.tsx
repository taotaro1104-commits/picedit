import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useNavigation } from '../navigation'
import { buildPath, type Route } from '../routing'

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly to: Route
}

/** 検索エンジンが辿れる通常の <a href> を出しつつ、クリック時はページ遷移せずに切り替える。 */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const { navigate } = useNavigation()
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={buildPath(to)} onClick={handle} {...rest} />
}
