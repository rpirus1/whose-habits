import { Flag as FlagIcon, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Flag } from '@/components/Flag'
import { SplitBars } from '@/components/SplitBars'
import { StickyFooter } from '@/components/StickyFooter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCulture } from '@/content/cultures'
import type { PublicReveal, Snapshot } from '@/game/protocol'
import { alreadySent, trackOnce } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { enterHighlight, enterScreen } from '@/lib/motion'

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
    <div className={cn('flex flex-1 flex-col gap-5', enterScreen)}>
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          Round {reveal.index + 1} of {reveal.total}
        </span>
        {me && (
          <Badge variant="soft" className="h-7 px-3 text-sm font-semibold tabular-nums">
            Score: {me.score}
          </Badge>
        )}
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
          className={cn(
            // Flag and name only, no box: the answer is the headline of this screen.
            'flex items-center gap-3 text-[1.625rem] font-bold',
            enterHighlight,
          )}
        >
          <Flag code={culture.code} className="size-9" />
          {culture.name}
        </p>
      </section>

      <div className="flex flex-col gap-1">
        <p className="border-border flex gap-3 rounded-2xl border border-dashed p-4 text-sm leading-snug">
          <Lightbulb className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{reveal.note}</span>
        </p>
        <ReportButton
          key={reveal.statementId}
          gameId={snapshot.gameId}
          statementId={reveal.statementId}
        />
      </div>

      <Separator />

      <SplitBars
        cultures={snapshot.settings.cultures}
        split={reveal.split}
        answer={reveal.answer}
      />

      <StickyFooter>
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
      </StickyFooter>
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
    // Same card as Host controls; correct shows only as green text, not a fill.
    <div className="bg-card rounded-2xl px-4 py-3 text-center" role="status">
      <p className={cn('text-xl font-bold', correct && 'text-success')}>{title}</p>
      {detail && <p className="text-muted-foreground text-sm">{detail}</p>}
    </div>
  )
}

/** Flags a statement for review. Only the statement id is logged, once per device. */
function ReportButton({ gameId, statementId }: { gameId: string; statementId: string }) {
  const key = `report:${statementId}`
  const [reported, setReported] = useState(() => alreadySent(key))

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground self-center"
      disabled={reported}
      onClick={() => {
        trackOnce(key, { type: 'report', gameId, statementId })
        setReported(true)
        toast.success('Thanks! We’ll review this statement.')
      }}
    >
      <FlagIcon /> {reported ? 'Reported' : 'Report this statement'}
    </Button>
  )
}
