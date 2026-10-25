import { ChevronRight, Lightbulb, Pointer, Trophy, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { OPTIONS_PER_ROUND } from '@/game/selection'
import { POINTS_CORRECT, POINTS_FIRST_CORRECT_BONUS } from '@/game/scoring'

const points = (n: number, kind = '') => `${n} ${kind}point${n === 1 ? '' : 's'}`

/**
 * The rules in three lines, closed by default, for whoever is waiting in the lobby. The timer and
 * the random-mode line follow the host's settings, so the text always matches this game.
 */
export function HowToPlay({ seconds, random }: { seconds: number; random: boolean }) {
  return (
    <details className="group bg-card rounded-2xl">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-medium [&::-webkit-details-marker]:hidden">
        How to play
        <ChevronRight
          className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <ol className="flex flex-col gap-3 px-4 pb-4 text-sm leading-snug">
        <Step icon={Pointer}>
          <strong>
            A habit pops up on everyone’s phone. Tap the country you think it belongs to.
          </strong>{' '}
          <span className="text-muted-foreground">
            You have {seconds} seconds.
            {random && ` Each round shows ${OPTIONS_PER_ROUND} different countries.`}
          </span>
        </Step>
        <Step icon={Trophy}>
          <strong>
            Right answer: {points(POINTS_CORRECT)}. Fastest right answer:{' '}
            {points(POINTS_FIRST_CORRECT_BONUS, 'bonus ')}.
          </strong>
        </Step>
        <Step icon={Lightbulb}>
          <strong>Not sure? Tap “I don’t know”.</strong>{' '}
          <span className="text-muted-foreground">
            After each round you’ll see the answer and a short fact.
          </span>
        </Step>
      </ol>
    </details>
  )
}

/** One rule, with its icon in the same round chip as the player initials. */
function Step({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
        <Icon className="text-primary size-5" aria-hidden />
      </span>
      <p className="pt-0.5">{children}</p>
    </li>
  )
}
