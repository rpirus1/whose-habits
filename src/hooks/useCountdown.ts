import { useEffect, useState } from 'react'

const FRAME_MS = 100

/**
 * Milliseconds left until a host-clock deadline, on this device's clock.
 * While paused (endsAt null), returns the frozen remainingMs.
 */
export function useCountdown(
  endsAt: number | null,
  remainingMs: number | null,
  clockOffset: number,
): number {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (endsAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), FRAME_MS)
    return () => clearInterval(id)
  }, [endsAt])

  if (endsAt === null) return remainingMs ?? 0
  return Math.max(0, endsAt - clockOffset - now)
}
