import { ChevronRight } from 'lucide-react'
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
      <ol className="flex list-decimal flex-col gap-2 px-4 pb-4 pl-8 text-sm leading-snug">
        <li>
          <strong>
            A habit pops up on everyone’s phone. Tap the country you think it belongs to.
          </strong>{' '}
          <span className="text-muted-foreground">
            You have {seconds} seconds.
            {random && ` Each round shows ${OPTIONS_PER_ROUND} different countries.`}
          </span>
        </li>
        <li>
          <strong>
            Right answer: {points(POINTS_CORRECT)}. Fastest right answer:{' '}
            {points(POINTS_FIRST_CORRECT_BONUS, 'bonus ')}.
          </strong>
        </li>
        <li>
          <strong>Not sure? Tap “I don’t know”.</strong>{' '}
          <span className="text-muted-foreground">
            After each round you’ll see the answer and a short fact.
          </span>
        </li>
      </ol>
    </details>
  )
}
