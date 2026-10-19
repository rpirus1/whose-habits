import { CultureButton } from '@/components/CultureButton'
import { TimerBar } from '@/components/TimerBar'
import { Button } from '@/components/ui/button'
import type { Snapshot } from '@/game/protocol'
import type { Choice } from '@/game/types'
import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/lib/utils'
import { enterScreen } from '@/lib/motion'

export function QuestionView({
  snapshot,
  meId,
  myChoice,
  confirmed,
  clockOffset,
  onChoose,
}: {
  snapshot: Snapshot
  meId: string
  myChoice: Choice | null
  /** The host has the current choice (always true on the host's own device). */
  confirmed: boolean
  clockOffset: number
  onChoose: (choice: Choice) => void
}) {
  const question = snapshot.question!
  const msLeft = useCountdown(question.endsAt, question.remainingMs, clockOffset)
  const totalMs = snapshot.settings.seconds * 1000
  const canAnswer = question.answeringIds.includes(meId)
  const locked = !canAnswer || snapshot.paused || msLeft <= 0
  const answering = snapshot.players.filter(
    (p) => p.connected && question.answeringIds.includes(p.id),
  )
  const answered = answering.filter((p) => question.answeredIds.includes(p.id)).length

  return (
    <div className={cn('flex flex-1 flex-col gap-5', enterScreen)}>
      <div className="flex flex-col gap-3">
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>
            Round {question.index + 1} of {question.total}
          </span>
          <span aria-live="polite">
            {answered} of {answering.length} answered
          </span>
        </div>
        <TimerBar msLeft={msLeft} totalMs={totalMs} paused={snapshot.paused} />
      </div>

      <p className="text-muted-foreground text-center text-sm">Where is this most typical?</p>
      <blockquote className="bg-card flex min-h-36 items-center justify-center rounded-2xl p-5 text-center text-2xl leading-snug font-semibold text-balance">
        {question.text}
      </blockquote>

      <div className="mt-auto flex flex-col gap-3">
        <StatusLine
          canAnswer={canAnswer}
          paused={snapshot.paused}
          timeUp={msLeft <= 0}
          myChoice={myChoice}
          confirmed={confirmed}
          answeredEarlier={question.answeredIds.includes(meId)}
        />
        <div
          className={cn(
            'grid gap-2',
            snapshot.settings.cultures.length > 3 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {snapshot.settings.cultures.map((code) => (
            <CultureButton
              key={code}
              code={code}
              selected={myChoice === code}
              disabled={locked}
              onClick={() => onChoose(code)}
            />
          ))}
        </div>
        <Button
          variant={myChoice === 'unknown' ? 'secondary' : 'ghost'}
          size="xl"
          disabled={locked}
          aria-pressed={myChoice === 'unknown'}
          onClick={() => onChoose('unknown')}
        >
          I don't know
        </Button>
      </div>
    </div>
  )
}

function StatusLine({
  canAnswer,
  paused,
  timeUp,
  myChoice,
  confirmed,
  answeredEarlier,
}: {
  canAnswer: boolean
  paused: boolean
  timeUp: boolean
  myChoice: Choice | null
  confirmed: boolean
  /** The host has an answer from us that this device doesn't remember (after a refresh). */
  answeredEarlier: boolean
}) {
  const text = !canAnswer
    ? "You joined mid-round. You'll play from the next statement."
    : paused
      ? 'Paused by the host'
      : timeUp
        ? "Time's up!"
        : myChoice
          ? confirmed
            ? 'Answer locked in. You can still change it.'
            : 'Sending…'
          : answeredEarlier
            ? 'Your answer is in. Tap to change it.'
            : 'Tap your answer'
  return (
    <p className="text-muted-foreground min-h-5 text-center text-sm" aria-live="polite">
      {text}
    </p>
  )
}
