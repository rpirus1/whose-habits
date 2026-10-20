// Light, dark, or follow the phone. The choice is saved on this device only.
// index.html applies the same choice before the first paint (no flash); this module keeps
// it applied afterwards and lets components read and change it.
import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

/** Same key as the inline script in index.html. Stored as a plain string. */
const KEY = 'cc:theme'
/** Safari tints its toolbar and status bar with theme-color: keep it on the page background. */
const THEME_COLOR = { light: '#fcf3f0', dark: '#090504' }

const systemLight = window.matchMedia('(prefers-color-scheme: light)')
const listeners = new Set<() => void>()
let choice = read()

function read(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

const resolved = (): 'light' | 'dark' =>
  choice === 'system' ? (systemLight.matches ? 'light' : 'dark') : choice

function apply() {
  const theme = resolved()
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  for (const listener of listeners) listener()
}

export function setTheme(next: ThemeChoice) {
  choice = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Not fatal: the theme just won't survive a refresh.
  }
  apply()
}

systemLight.addEventListener('change', apply)
apply()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The player's choice and the theme actually showing. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => choice)
  const resolvedTheme = useSyncExternalStore(subscribe, resolved)
  return { theme, resolvedTheme, setTheme }
}
