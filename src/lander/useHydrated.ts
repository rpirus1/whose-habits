import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/**
 * False during the prerender and the hydration pass, true after. Device-specific parts of the
 * lander (saved rooms, theme) wait for it, so the hydrated markup matches the prerendered one.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
}
