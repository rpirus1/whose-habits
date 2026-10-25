import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { GameState } from '@/game/types'
import { haptic } from '@/lib/haptics'
import { popIn } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * In the lobby, a short toast for each new player, so a first-time host notices who has arrived
 * without scrolling to the list. Only new ids: a player reconnecting doesn't count as joining.
 */
export function useJoinToasts(state: GameState) {
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    const ids = state.players.map((p) => p.id)
    // The first render (or a restored room) sets the baseline, without toasts.
    if (!seen.current) {
      seen.current = new Set(ids)
      return
    }
    for (const p of state.players) {
      if (seen.current.has(p.id)) continue
      seen.current.add(p.id)
      if (state.phase !== 'lobby' || p.isHost) continue
      haptic('notice')
      toast(`${p.name} joined`, {
        id: `joined:${p.id}`,
        duration: 2500,
        // Sonner's icon slot is 16px; the initial chip needs room.
        classNames: { icon: 'size-7! mr-1!' },
        icon: (
          <span
            className={cn(
              'bg-muted flex size-7 items-center justify-center rounded-full text-sm font-semibold uppercase',
              popIn,
            )}
          >
            {p.name.slice(0, 1)}
          </span>
        ),
      })
    }
  }, [state.players, state.phase])
}
