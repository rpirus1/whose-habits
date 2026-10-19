import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`. Browsers drop the lock when the tab is hidden,
 * so it is re-requested when the page becomes visible again. Silently does nothing
 * where the Wake Lock API isn't supported (older iOS) or is refused (low battery).
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible' || lock) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        lock = sentinel
        sentinel.addEventListener('release', () => {
          if (lock === sentinel) lock = null
        })
      } catch {
        // Not allowed right now; try again on the next visibility change.
      }
    }

    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [active])
}
