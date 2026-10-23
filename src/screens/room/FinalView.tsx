import { Crown, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Flag } from '@/components/Flag'
import { StickyFooter } from '@/components/StickyFooter'
import { Button } from '@/components/ui/button'
import { getCulture } from '@/content/cultures'
import type { Snapshot } from '@/game/protocol'
import { track, trackOnce } from '@/lib/analytics'
import type { PlayAgainVote } from '@/lib/analytics'
import { shareLink } from '@/lib/share'
import { load, save } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { enterScreen } from '@/lib/motion'

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
  // Nobody scored: no winner, no places. Everyone is listed, host first, then in join order.
  const nobodyScored = final.ranking.every((r) => !players.get(r.id)?.score)
  const rows = nobodyScored
    ? [...snapshot.players]
        .sort((a, b) => Number(b.isHost) - Number(a.isHost))
        .map((p) => ({ id: p.id, rank: 0 }))
    : final.ranking
  const myRank = final.ranking.find((r) => r.id === meId)?.rank
  const role = onPlayAgain ? 'host' : 'guest'
  // Join funnel: a guest made it to the end of a game (the host is counted by game_finished).
  useEffect(() => {
    if (role === 'guest' && snapshot.gameId) {
      trackOnce(`final:${snapshot.gameId}`, {
        type: 'join_step',
        step: 'final',
        gameId: snapshot.gameId,
      })
    }
  }, [role, snapshot.gameId])

  async function tellAFriend() {
    track({ type: 'share_click', gameId: snapshot.gameId, role })
    try {
      const result = await shareLink({
        title: 'Whose Habits',
        text: 'A party game about the little habits that make every country feel like home. Free, no app, no sign-up.',
        url: window.location.origin,
      })
      if (result === 'copied') toast.success('Link copied')
    } catch {
      toast.error(`Couldn't share. The link is ${window.location.origin}`)
    }
  }

  return (
    <div className={cn('flex flex-1 flex-col gap-6', enterScreen)}>
      <header className="text-center">
        <p className="text-muted-foreground text-sm">
          {final.roundsPlayed} {final.roundsPlayed === 1 ? 'round' : 'rounds'} played
        </p>
        <h1 className="font-heading text-3xl font-bold">
          {nobodyScored ? 'Zero all round' : myRank === 1 ? 'You won!' : 'Final scores'}
        </h1>
        {nobodyScored && (
          <p className="text-muted-foreground mt-1">Those habits were trickier than they looked.</p>
        )}
      </header>

      <ol className="flex flex-col gap-2">
        {rows.map(({ id, rank }) => {
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
              {!nobodyScored && (
                <span className="text-muted-foreground w-6 text-lg tabular-nums">{rank}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-lg">
                {p.name}
                {id === meId && <span className="text-muted-foreground text-sm"> (you)</span>}
              </span>
              {rank === 1 && !nobodyScored && (
                <Crown
                  className="fill-highlight text-highlight-foreground dark:text-highlight size-5"
                  aria-label="Winner"
                />
              )}
              {!nobodyScored && <span className="text-xl font-bold tabular-nums">{p.score}</span>}
            </li>
          )
        })}
      </ol>

      <PlayAgainPoll gameId={snapshot.gameId} role={role} />

      {final.surprising.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Most surprising</h2>
          {final.surprising.map((s) => {
            const culture = getCulture(s.answer)
            return (
              <article key={s.statementId} className="bg-card flex flex-col gap-2 rounded-2xl p-4">
                <p className="leading-snug font-medium">“{s.text}”</p>
                <p className="flex items-center gap-2 text-sm">
                  <Flag code={culture.code} className="size-4" />
                  <span className="font-semibold">{culture.name}</span>
                  <span className="text-muted-foreground">
                    · {Math.round(s.percentCorrect * 100)}% got it right
                  </span>
                </p>
                <p className="text-muted-foreground text-sm leading-snug">{s.note}</p>
              </article>
            )
          })}
        </section>
      )}

      <StickyFooter className="flex flex-col gap-2">
        {onPlayAgain ? (
          <Button size="xl" className="w-full" onClick={onPlayAgain}>
            Play again
          </Button>
        ) : (
          // Every guest just finished a game: the best moment to turn them into a host.
          <Button asChild size="xl" className="w-full">
            <Link
              to="/new?from=cta"
              onClick={() => track({ type: 'host_cta_click', gameId: snapshot.gameId })}
            >
              Host your own game
            </Link>
          </Button>
        )}
        <Button size="xl" variant="ghost" className="w-full" onClick={tellAFriend}>
          <Share2 /> Tell a friend
        </Button>
      </StickyFooter>
    </div>
  )
}

const VOTES: { value: PlayAgainVote; label: string }[] = [
  { value: 'yes', label: 'Yes!' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'Not really' },
]

/** One tap, anonymous: the "would you play again?" success signal. Remembered per game. */
function PlayAgainPoll({ gameId, role }: { gameId: string; role: 'host' | 'guest' }) {
  const key = `vote:${gameId}`
  const [vote, setVote] = useState(() => load<PlayAgainVote>(key))

  function choose(value: PlayAgainVote) {
    setVote(value)
    save(key, value)
    track({ type: 'play_again_vote', gameId, vote: value, role })
  }

  return (
    <section className="bg-card flex flex-col gap-3 rounded-2xl p-4 text-center">
      <h2 className="font-medium">{vote ? 'Thanks for telling me!' : 'Would you play again?'}</h2>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Would you play again?">
        {VOTES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={vote === value}
            disabled={!!vote}
            onClick={() => choose(value)}
            className={cn(
              'h-12 rounded-xl border-2 font-medium transition-colors',
              vote === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border',
              vote && vote !== value && 'opacity-40',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
