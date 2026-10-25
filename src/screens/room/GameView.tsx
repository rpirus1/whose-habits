import type { Snapshot } from '@/game/protocol'
import type { Choice } from '@/game/types'
import { FinalView } from './FinalView'
import { QuestionView } from './QuestionView'
import { RevealView } from './RevealView'
import type { ReportHandlers } from './RevealView'
import { useCountdown } from '@/hooks/useCountdown'

/** The in-game screen for everyone (host included): question, reveal or final scores. */
export function GameView({
  snapshot,
  meId,
  myChoice,
  confirmed,
  clockOffset,
  onChoose,
  onNext,
  onPlayAgain,
  onResume,
  onReport,
}: {
  snapshot: Snapshot
  meId: string
  myChoice: Choice | null
  confirmed: boolean
  clockOffset: number
  onChoose: (choice: Choice) => void
  onNext?: () => void
  onPlayAgain?: () => void
  /** Host only. */
  onResume?: () => void
  onReport: ReportHandlers
}) {
  if (snapshot.final) {
    return <FinalView snapshot={snapshot} meId={meId} onPlayAgain={onPlayAgain} />
  }
  // A reveal wins over the question: it's either the current one or the host looking back.
  if (snapshot.reveal) {
    return (
      <>
        {snapshot.holdUntil ? (
          <HoldNotice holdUntil={snapshot.holdUntil} clockOffset={clockOffset} />
        ) : (
          snapshot.paused &&
          !snapshot.viewing && (
            <p role="status" className="bg-muted rounded-xl px-4 py-3 text-center text-sm">
              Paused by the host
            </p>
          )
        )}
        {/* Keyed so going Back to an earlier reveal animates in like a new screen. */}
        <RevealView
          key={`reveal-${snapshot.reveal.index}-${snapshot.viewing}`}
          snapshot={snapshot}
          meId={meId}
          clockOffset={clockOffset}
          onNext={onNext}
          onReport={onReport}
        />
      </>
    )
  }
  if (snapshot.question) {
    return (
      <QuestionView
        key={snapshot.question.roundId}
        snapshot={snapshot}
        meId={meId}
        myChoice={myChoice}
        confirmed={confirmed}
        clockOffset={clockOffset}
        onChoose={onChoose}
        onResume={onResume}
      />
    )
  }
  return null
}

/** Everyone sees this while someone picks a report reason. Anonymous on purpose. */
function HoldNotice({ holdUntil, clockOffset }: { holdUntil: number; clockOffset: number }) {
  const left = useCountdown(holdUntil, null, clockOffset)
  return (
    <p role="status" className="bg-muted rounded-xl px-4 py-3 text-center text-sm">
      A player is reporting this statement…{' '}
      <span className="text-muted-foreground tabular-nums">{Math.ceil(left / 1000)} s</span>
    </p>
  )
}
