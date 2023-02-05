// Based on Matt Stobbs' excellent article https://www.mattstobbs.com/remix-dark-mode/
import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

import type { FetcherWithComponents } from '@remix-run/react'
import { useFetcher } from '@remix-run/react'

import { Theme, prefersDarkMQ, getPrefers, isTheme } from './utils'

// ThemeContext
type ThemeContextType = {
  theme: Theme | null
  setTheme: Dispatch<SetStateAction<Theme | null>>
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// ThemeProvider
function ThemeProvider({ children, theme }: { children: ReactNode; theme: Theme | null }) {
  const [themeInState, setThemeInState] = useState<Theme | null>(() => {
    if (theme) {
      if (isTheme(theme)) {
        return theme
      } else {
        return null
      }
    }
    // there's no way for us to know what the theme should be in this context
    // the client will have to figure it out before hydration.
    if (typeof document === 'undefined') {
      return null
    }
    return getPrefers()
  })

  const persistTheme: FetcherWithComponents<any> = useFetcher()
  // TODO: remove this when useFetcher/persistTheme is memoized properly
  const persistThemeRef = useRef(persistTheme)
  useEffect(() => {
    persistThemeRef.current = persistTheme
  }, [persistTheme])

  const mountRun = useRef(false)
  useEffect(() => {
    if (!mountRun.current) {
      mountRun.current = true
      return
    }
    if (!themeInState) {
      return
    }
    persistThemeRef.current.submit(
      { theme: themeInState },
      { action: 'actions/set-theme', method: 'post' }
    )
  }, [themeInState])

  useEffect(() => {
    const mediaQuery = window.matchMedia(prefersDarkMQ)
    const handleChange = () => {
      const prefers = getPrefers()
      setThemeInState(prefers)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const contextValue = useMemo(() => {
    return { theme: themeInState, setTheme: setThemeInState }
  }, [themeInState])

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

// Hook helper useTheme
function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { Theme, ThemeProvider, useTheme }
