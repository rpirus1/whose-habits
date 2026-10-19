import { Lightbulb } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SplitBars } from '@/components/SplitBars'
import { Button } from '@/components/ui/button'
import { getCulture } from '@/content/cultures'
import type { PublicReveal, Snapshot } from '@/game/protocol'
import { cn } from '@/lib/utils'

export function RevealView({
  snapshot,
  meId,
  onNext,
}: {
  snapshot: Snapshot
  meId: string
  /** Host only. */
  onNext?: () => void
}) {
  const reveal = snapshot.reveal!
  const culture = getCulture(reveal.answer)
  const isLast = reveal.index + 1 >= reveal.total
  const me = snapshot.players.find((p) => p.id === meId)

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="text-muted-foreground flex justify-between text-sm">
        <span>
          Round {reveal.index + 1} of {reveal.total}
        </span>
        {me && <span>Your score: {me.score}</span>}
      </div>

      {snapshot.viewing ? (
        <p className="bg-muted rounded-xl px-4 py-2 text-center text-sm">
          The host is looking back at an earlier statement.
        </p>
      ) : (
        <MyResult reveal={reveal} meId={meId} />
      )}

      <section className="flex flex-col items-center gap-3 text-center">
        <p className="text-muted-foreground text-lg leading-snug text-balance">“{reveal.text}”</p>
        <p className="text-muted-foreground text-sm">Most associated with</p>
        <p
          style={{ '--c': `var(${culture.colorVar})` } as CSSProperties}
          className="rounded-2xl bg-[var(--c)] px-6 py-3 text-3xl font-bold text-[oklch(0.18_0.02_270)]"
        >
          {culture.name}
        </p>
      </section>

      <p className="bg-card flex gap-3 rounded-2xl p-4 leading-snug">
        <Lightbulb className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <span>{reveal.note}</span>
      </p>

      <SplitBars
        cultures={snapshot.settings.cultures}
        split={reveal.split}
        answer={reveal.answer}
      />

      <div className="bg-background sticky bottom-0 mt-auto pt-2">
        {onNext ? (
          <Button size="xl" className="w-full" onClick={onNext}>
            {snapshot.viewing && snapshot.phase === 'question'
              ? 'Back to the question'
              : isLast && !snapshot.viewing
                ? 'See final scores'
                : 'Next statement'}
          </Button>
        ) : (
          <p className="text-muted-foreground text-center text-sm">Waiting for the host…</p>
        )}
      </div>
    </div>
  )
}

function MyResult({ reveal, meId }: { reveal: PublicReveal; meId: string }) {
  const choice = reveal.choices[meId]
  const points = reveal.points[meId] ?? 0
  const correct = reveal.correctIds.includes(meId)

  const [title, detail] = correct
    ? [
        `Correct! +${points}`,
        reveal.bonusId === meId ? 'Fastest correct answer: bonus point.' : null,
      ]
    : choice === undefined
      ? ['No answer this time', null]
      : choice === 'unknown'
        ? ["You didn't know", 'Now you do.']
        : ['Not quite', `You picked ${getCulture(choice).name}.`]

  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 text-center',
        correct ? 'bg-primary text-primary-foreground' : 'bg-muted',
      )}
      role="status"
    >
      <p className="text-xl font-bold">{title}</p>
      {detail && <p className={cn('text-sm', !correct && 'text-muted-foreground')}>{detail}</p>}
    </div>
  )
}
