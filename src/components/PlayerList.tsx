import { X } from 'lucide-react'
import type { PublicPlayer } from '@/game/protocol'
import { MAX_PLAYERS } from '@/game/types'
import { Button } from '@/components/ui/button'
import { useConfirmTap } from '@/hooks/useConfirmTap'
import { cn } from '@/lib/utils'

export function PlayerList({
  players,
  meId,
  onKick,
  compact = false,
}: {
  players: PublicPlayer[]
  meId: string
  /** Host only: shows a remove button next to other players. */
  onKick?: (player: PublicPlayer) => void
  /** Smaller rows, for the host menu. */
  compact?: boolean
}) {
  const onlyHost = players.length === 1

  return (
    <section className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')} aria-live="polite">
      <h2 className="flex items-baseline justify-between font-medium">
        Players
        <span className="text-muted-foreground text-sm font-normal">
          {players.length} / {MAX_PLAYERS}
        </span>
      </h2>
      <ul className={cn('flex flex-col', compact ? 'gap-1' : 'gap-2')}>
        {players.map((p) => (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-xl',
              compact ? 'bg-muted min-h-11 pr-1 pl-2' : 'bg-card min-h-14 px-3',
              !p.connected && 'opacity-50',
            )}
          >
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-semibold uppercase',
                compact ? 'bg-background size-7 text-sm' : 'bg-muted size-9',
              )}
            >
              {p.name.slice(0, 1)}
            </span>
            <span className={cn('min-w-0 flex-1 truncate', compact ? 'text-base' : 'text-lg')}>
              {p.name}
            </span>
            <span className="text-muted-foreground text-sm">
              {[
                p.id === meId && 'you',
                p.isHost && 'host',
                p.left ? 'left' : !p.connected && 'offline',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {onKick && !p.isHost && <RemoveButton player={p} onRemove={onKick} compact={compact} />}
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

/** Two taps to remove: the first turns the X into "Remove?", the second confirms. */
function RemoveButton({
  player,
  onRemove,
  compact,
}: {
  player: PublicPlayer
  onRemove: (player: PublicPlayer) => void
  compact: boolean
}) {
  const { armed, tap } = useConfirmTap(() => onRemove(player))
  return armed ? (
    <Button
      variant="destructive"
      size={compact ? 'sm' : 'lg'}
      onClick={tap}
      aria-label={`Confirm removing ${player.name}`}
    >
      Remove?
    </Button>
  ) : (
    <Button
      variant="ghost"
      size={compact ? 'icon' : 'icon-lg'}
      onClick={tap}
      aria-label={`Remove ${player.name}`}
    >
      <X />
    </Button>
  )
}
