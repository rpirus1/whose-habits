import { Crown } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { getCulture } from '@/content/cultures'
import type { Snapshot } from '@/game/protocol'
import { cn } from '@/lib/utils'

export function FinalView({
  snapshot,
  meId,
  onPlayAgain,
}: {
  snapshot: Snapshot
  meId: string
  /** Host only. */
  onPlayAgain?: () => void
}) {
  const final = snapshot.final!
  const players = new Map(snapshot.players.map((p) => [p.id, p]))
  const myRank = final.ranking.find((r) => r.id === meId)?.rank

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="text-center">
        <p className="text-muted-foreground text-sm">
          {final.roundsPlayed} {final.roundsPlayed === 1 ? 'round' : 'rounds'} played
        </p>
        <h1 className="font-heading text-3xl font-bold">
          {myRank === 1 ? 'You won!' : 'Final scores'}
        </h1>
      </header>

      <ol className="flex flex-col gap-2">
        {final.ranking.map(({ id, rank }) => {
          const p = players.get(id)
          if (!p) return null
          return (
            <li
              key={id}
              className={cn(
                'bg-card flex min-h-14 items-center gap-3 rounded-xl px-4',
                id === meId && 'ring-primary ring-2',
              )}
            >
              <span className="text-muted-foreground w-6 font-mono text-lg">{rank}</span>
              <span className="min-w-0 flex-1 truncate text-lg">
                {p.name}
                {id === meId && <span className="text-muted-foreground text-sm"> (you)</span>}
              </span>
              {rank === 1 && <Crown className="text-primary size-5" aria-label="Winner" />}
              <span className="font-mono text-xl font-bold tabular-nums">{p.score}</span>
            </li>
          )
        })}
      </ol>

      {final.surprising.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Most surprising</h2>
          {final.surprising.map((s) => {
            const culture = getCulture(s.answer)
            return (
              <article
                key={s.statementId}
                style={{ '--c': `var(${culture.colorVar})` } as CSSProperties}
                className="bg-card flex flex-col gap-2 rounded-2xl border-l-4 border-[var(--c)] p-4"
              >
                <p className="leading-snug font-medium">“{s.text}”</p>
                <p className="text-sm">
                  <span className="font-semibold">{culture.name}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {Math.round(s.percentCorrect * 100)}% got it right
                  </span>
                </p>
                <p className="text-muted-foreground text-sm leading-snug">{s.note}</p>
              </article>
            )
          })}
        </section>
      )}

      <div className="bg-background sticky bottom-0 mt-auto pt-2">
        {onPlayAgain ? (
          <Button size="xl" className="w-full" onClick={onPlayAgain}>
            Play again
          </Button>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            Thanks for playing! The host can start another game.
          </p>
        )}
      </div>
    </div>
  )
}
