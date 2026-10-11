import { createContext, useContext } from 'react'
import type { Route } from './routing'

export interface Navigation {
  readonly route: Route
  navigate(route: Route): void
}

export const NavigationContext = createContext<Navigation>({
  route: { locale: 'ja', page: 'ec' },
  navigate: () => {},
})

export const useNavigation = (): Navigation => useContext(NavigationContext)
