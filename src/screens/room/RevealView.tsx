import { Flag as FlagIcon, Lightbulb } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { Flag } from '@/components/Flag'
import { SplitBars } from '@/components/SplitBars'
import { StickyFooter } from '@/components/StickyFooter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getCulture } from '@/content/cultures'
import type { PublicReveal, Snapshot } from '@/game/protocol'
import type { ReportReason } from '@/game/types'
import { alreadySent, markSent } from '@/lib/analytics'
import { celebrate } from '@/lib/celebrate'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { enterHighlight, enterScreen, popIn } from '@/lib/motion'
import { useCountdown } from '@/hooks/useCountdown'
import { ReportDialog } from './ReportDialog'

export interface ReportHandlers {
  /** The pop-up opened: the host holds the game. */
  open: (statementId: string) => void
  done: (statementId: string, reason: ReportReason) => void
}

export function RevealView({
  snapshot,
  meId,
  clockOffset,
  onNext,
  onReport,
}: {
  snapshot: Snapshot
  meId: string
  clockOffset: number
  /** Host only. */
  onNext?: () => void
  onReport: ReportHandlers
}) {
  const reveal = snapshot.reveal!
  const culture = getCulture(reveal.answer)
  const isLast = reveal.index + 1 >= reveal.total
  const me = snapshot.players.find((p) => p.id === meId)
  const nextAt = snapshot.nextAt ?? null
  const toFinal = isLast && !snapshot.viewing
  const nextLabel = toFinal ? 'Final scores in' : 'Next habit in'

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
          The host is looking back at an earlier habit.
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
          <Lightbulb
            className={cn(
              'text-primary mt-0.5 size-5 shrink-0',
              // "I don't know" → "Now you do": the bulb lights up once.
              !snapshot.viewing && reveal.choices[meId] === 'unknown' && 'motion-safe:animate-glow',
            )}
            aria-hidden
          />
          <span>{reveal.note}</span>
        </p>
        <ReportButton key={reveal.statementId} statementId={reveal.statementId} {...onReport} />
      </div>

      <Separator />

      <SplitBars cultures={reveal.options} split={reveal.split} answer={reveal.answer} />

      <StickyFooter>
        {onNext ? (
          <Button
            size="xl"
            className="w-full tabular-nums"
            disabled={!!snapshot.holdUntil || nextAt !== null}
            onClick={onNext}
          >
            {snapshot.viewing && snapshot.phase === 'question' ? (
              'Back to the question'
            ) : nextAt !== null ? (
              // One span: the button spaces out its children (icon and text).
              <span>
                {nextLabel} <SecondsLeft key={nextAt} endsAt={nextAt} clockOffset={clockOffset} />
                s…
              </span>
            ) : toFinal ? (
              'See final scores'
            ) : (
              'Next habit'
            )}
          </Button>
        ) : nextAt !== null ? (
          <CountdownPill key={nextAt} label={nextLabel} endsAt={nextAt} clockOffset={clockOffset} />
        ) : (
          <p className="text-muted-foreground text-center text-sm">Waiting for the host…</p>
        )}
      </StickyFooter>
    </div>
  )
}

/**
 * Players' heads-up that the host tapped Next: a small pill where "Waiting for the host…" was,
 * with a ring that empties as the count runs down. Keyed by the deadline, so it restarts cleanly.
 */
function CountdownPill({
  label,
  endsAt,
  clockOffset,
}: {
  label: string
  /** Host clock. */
  endsAt: number
  clockOffset: number
}) {
  // The ring's length is set once, from the time left when the pill appeared.
  const [duration] = useState(() => Math.max(0, endsAt - clockOffset - Date.now()))
  useEffect(() => haptic('notice'), [])
  return (
    <p
      role="status"
      className={cn(
        'bg-card ring-border mx-auto flex h-11 w-fit items-center gap-2 rounded-full pr-4 pl-2 text-sm font-medium shadow-sm ring-1',
        popIn,
      )}
    >
      <svg viewBox="0 0 24 24" className="text-primary size-7 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="stroke-muted" />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          className="countdown-ring stroke-current"
          style={{ '--countdown-ms': `${duration}ms` } as CSSProperties}
        />
      </svg>
      <span>
        {label} <SecondsLeft endsAt={endsAt} clockOffset={clockOffset} />
      </span>
    </p>
  )
}

/**
 * Whole seconds left in the Next countdown. Mount it fresh for each countdown (key it by the
 * deadline), so it starts from the real time, not from the screen's first render.
 */
function SecondsLeft({ endsAt, clockOffset }: { endsAt: number; clockOffset: number }) {
  const left = useCountdown(endsAt, null, clockOffset)
  // Never "0": the next screen replaces this one as the count runs out.
  return <span className="tabular-nums">{Math.max(1, Math.ceil(left / 1000))}</span>
}

function MyResult({ reveal, meId }: { reveal: PublicReveal; meId: string }) {
  const choice = reveal.choices[meId]
  const points = reveal.points[meId] ?? 0
  const correct = reveal.correctIds.includes(meId)
  const bonus = reveal.bonusId === meId
  const card = useRef<HTMLDivElement>(null)

  // Once per reveal (this view is keyed by round): confetti and a buzz for a right answer.
  const celebrated = useRef(false)
  useEffect(() => {
    if (!correct || celebrated.current || !card.current) return
    celebrated.current = true
    haptic(bonus ? 'bonus' : 'correct')
    void celebrate(card.current, bonus)
  }, [correct, bonus])

  const [title, detail] = correct
    ? ['Correct!', bonus ? 'Fastest correct answer: bonus point.' : null]
    : choice === undefined
      ? ['No answer this time', cheer(reveal)]
      : choice === 'unknown'
        ? ["You didn't know", 'Now you do.']
        : ['Not quite', `You picked ${getCulture(choice).name}. ${cheer(reveal)}`]

  return (
    // Same card as Host controls; correct shows only as green text, not a fill.
    <div ref={card} className="bg-card rounded-2xl px-4 py-3 text-center" role="status">
      <p className={cn('text-xl font-bold', correct && 'text-success')}>
        {title}
        {correct && (
          <span
            className={cn(
              'ml-1.5 inline-block',
              popIn,
              'motion-safe:fill-mode-backwards motion-safe:delay-200',
            )}
          >
            +{points}
          </span>
        )}
      </p>
      {detail && <p className="text-muted-foreground text-sm">{detail}</p>}
    </div>
  )
}

/** After a miss: how the room did, when that helps; otherwise a nudge for the next round. */
function cheer(reveal: PublicReveal) {
  const answered = Object.keys(reveal.choices).length
  const got = reveal.correctIds.length
  if (got === 0) return 'Nobody got this one.'
  if (got * 2 <= answered) return `Only ${got} of ${answered} got it.`
  return 'Next one’s yours!'
}

/**
 * Flags a statement for review: a pop-up asks why while the game holds for everyone. The host
 * sends the analytics event; this device only remembers that it reported the statement.
 */
function ReportButton({ statementId, open, done }: { statementId: string } & ReportHandlers) {
  const key = `report:${statementId}`
  const [reported, setReported] = useState(() => alreadySent(key))
  const [asking, setAsking] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground self-center"
        disabled={reported}
        onClick={() => {
          setReported(true)
          setAsking(true)
          open(statementId)
        }}
      >
        <FlagIcon /> {reported ? 'Reported' : 'Report this habit'}
      </Button>
      {asking && (
        <ReportDialog
          onDone={(reason) => {
            setAsking(false)
            markSent(key)
            done(statementId, reason)
            if (reason !== 'none') toast.success('Thanks for the feedback!')
          }}
        />
      )}
    </>
  )
}
