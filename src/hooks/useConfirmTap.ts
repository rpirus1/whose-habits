import { useEffect, useState } from 'react'

const CONFIRM_MS = 3000

/**
 * Two taps for destructive actions (end game, remove a player), so a stray tap with a
 * drink in hand does nothing. The first tap arms it for a few seconds; the second confirms.
 */
export function useConfirmTap(onConfirm: () => void) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), CONFIRM_MS)
    return () => clearTimeout(id)
  }, [armed])

  return {
    armed,
    tap: () => {
      if (armed) {
        setArmed(false)
        onConfirm()
      } else {
        setArmed(true)
      }
    },
  }
}
