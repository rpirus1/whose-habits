import { ThemeProvider as NextThemes, useTheme } from 'next-themes'
import { useEffect, type ReactNode } from 'react'

/** localStorage key for the player's choice: "system", "light" or "dark". index.html reads it too. */
export const THEME_KEY = 'cc:theme'

/** Safari tints its toolbar and status bar with theme-color: keep it on the page background. */
const THEME_COLOR = { light: '#fcf3f0', dark: '#090504' }

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_KEY}
    >
      <ThemeColorSync />
      {children}
    </NextThemes>
  )
}

function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const color = resolvedTheme === 'light' ? THEME_COLOR.light : THEME_COLOR.dark
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [resolvedTheme])
  return null
}
