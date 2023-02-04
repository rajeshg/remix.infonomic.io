// https://www.mattstobbs.com/remix-dark-mode/
import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

import { useFetcher } from '@remix-run/react'

enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}

// Helper to find system preference
const prefersDarkMQ = '(prefers-color-scheme: dark)'
const getSystemPrefersTheme = () =>
  window.matchMedia(prefersDarkMQ).matches ? Theme.DARK : Theme.LIGHT

// Helper to type check Theme value
const themes: Array<Theme> = Object.values(Theme)
function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme)
}

// ThemeContext
type ThemeContextType = {
  theme: Theme | null
  setTheme: Dispatch<SetStateAction<Theme | null>>
}
// type ThemeContextType = (Theme | Dispatch<SetStateAction<Theme | null>> | null)[]
// type ThemeContextType = [Theme | null, Dispatch<SetStateAction<Theme | null>>];
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// ThemeProvider
function ThemeProvider({ children, theme }: { children: ReactNode; theme: Theme | null }) {
  const [themeInState, setThemeInState] = useState<Theme | null>(() => {
    if (theme) {
      if (themes.includes(theme)) {
        return theme
      } else {
        return null
      }
    }
    // // there's no way for us to know what the theme should be in this context
    // // the client will have to figure it out before hydration.
    if (typeof window !== 'object') {
      return null
    }
    return getSystemPrefersTheme()
  })

  const persistTheme = useFetcher()
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
      setThemeInState(mediaQuery.matches ? Theme.DARK : Theme.LIGHT)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const contextValue = useMemo(
    () => ({ theme: themeInState, setTheme: setThemeInState }),
    [themeInState, setThemeInState]
  )

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

// JavaScript - needs to be run BEFORE React. See root.tsx
// Sets the system preference theme if no SSR theme / cookie
// has been set.
const clientThemeCode = `
;(() => {
  const head = document.documentElement;
  if(head.dataset.themeNoprefs) {
    const theme = window.matchMedia(${JSON.stringify(prefersDarkMQ)}).matches
      ? 'dark'
      : 'light';
    
    head.classList.toggle('dark', theme === 'dark');
    head.classList.toggle('light', theme === 'light');

    const meta = document.querySelector('meta[name=color-scheme]');
    if (meta) {
      if (theme === 'dark') {
        meta.content = 'dark light';
      } else if (theme === 'light') {
        meta.content = 'light dark';
      }
    } else {
      console.warn(
        "meta tag name='color-scheme' not found",
      );
    }
  }
})();
`

function ThemeMetaAndPrefs({ ssrTheme }: { ssrTheme: string | null }) {
  // Default or fallback - must agree with default theme
  // set in html element in entry.server.tsx
  console.log(ssrTheme)
  let colorScheme = 'light dark'
  if (ssrTheme && ssrTheme === 'dark') {
    colorScheme = 'dark light'
  }
  return (
    <>
      <meta name="color-scheme" content={colorScheme} />
      {ssrTheme ? null : <script dangerouslySetInnerHTML={{ __html: clientThemeCode }} />}
    </>
  )
}

export { Theme, ThemeProvider, useTheme, ThemeMetaAndPrefs, isTheme }
