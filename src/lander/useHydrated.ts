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

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

/** The visitor asked for less motion. False during the prerender and hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(reducedMotionQuery)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => matchMedia(reducedMotionQuery).matches,
    () => false,
  )
}
