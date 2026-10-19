import { X } from 'lucide-react'
import type { PublicPlayer } from '@/game/protocol'
import { MAX_PLAYERS } from '@/game/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PlayerList({
  players,
  meId,
  onKick,
}: {
  players: PublicPlayer[]
  meId: string
  /** Host only: shows a remove button next to other players. */
  onKick?: (player: PublicPlayer) => void
}) {
  const onlyHost = players.length === 1

  return (
    <section className="flex flex-col gap-3" aria-live="polite">
      <h2 className="flex items-baseline justify-between font-medium">
        Players
        <span className="text-muted-foreground text-sm font-normal">
          {players.length} / {MAX_PLAYERS}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={cn(
              'bg-card flex min-h-14 items-center gap-3 rounded-xl px-3',
              !p.connected && 'opacity-50',
            )}
          >
            <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full font-semibold uppercase">
              {p.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg">{p.name}</span>
            <span className="text-muted-foreground text-sm">
              {[p.id === meId && 'you', p.isHost && 'host', !p.connected && 'offline']
                .filter(Boolean)
                .join(' · ')}
            </span>
            {onKick && !p.isHost && (
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={`Remove ${p.name}`}
                onClick={() => onKick(p)}
              >
                <X />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {onlyHost && (
        <div className="text-muted-foreground flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 text-center">
          <span className="bg-primary size-2 animate-pulse rounded-full" aria-hidden />
          Waiting for others to join…
        </div>
      )}
    </section>
  )
}
