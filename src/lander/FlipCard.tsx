import { RotateCcw, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Flag } from '@/components/Flag'
import { getCulture } from '@/content/cultures'
import type { Sample } from './content'
import { useHydrated } from './useHydrated'

/**
 * A sample statement that flips over to show its answer. Both faces share one grid cell
 * (lander.css), so the card keeps its height and its neighbours don't move. The face that
 * is turned away is inert; focus follows the flip. Without JS both faces show.
 */
export function FlipCard({ sample }: { sample: Sample }) {
  const [flipped, setFlipped] = useState(false)
  const hydrated = useHydrated()
  const showButton = useRef<HTMLButtonElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    if (!moved.current) return
    ;(flipped ? backButton : showButton).current?.focus()
  }, [flipped])

  const flip = (next: boolean) => {
    moved.current = true
    setFlipped(next)
  }

  const face =
    'bg-card ring-border relative flex flex-col gap-4 rounded-2xl p-5 ring-1 has-[button:focus-visible]:ring-ring has-[button:focus-visible]:ring-3'
  // The button covers its face, so a tap anywhere on the card flips it.
  const button =
    'text-primary-soft flex min-h-11 items-center gap-2 self-start font-medium outline-none after:absolute after:inset-0 after:rounded-2xl'

  return (
    <li className="flip" data-flipped={flipped}>
      <div className="flip-inner">
        <div className={`flip-front ${face}`} inert={hydrated && flipped}>
          <p className="text-lg leading-snug font-semibold text-balance">{sample.text}</p>
          <button
            ref={showButton}
            type="button"
            className={`mt-auto ${button}`}
            onClick={() => flip(true)}
          >
            <RotateCw className="size-4" aria-hidden />
            Show answer
          </button>
        </div>
        <div className={`flip-back ${face}`} inert={hydrated && !flipped}>
          <p className="sr-only">Answer: </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-lg font-semibold">
            {sample.fits.map((code) => (
              <span key={code} className="flex items-center gap-2">
                <Flag code={code} className="size-7" />
                {getCulture(code).name}
              </span>
            ))}
          </p>
          <p className="text-muted-foreground">{sample.note}</p>
          <button
            ref={backButton}
            type="button"
            className={`mt-auto ${button}`}
            onClick={() => flip(false)}
          >
            <RotateCcw className="size-4" aria-hidden />
            Back to the habit
          </button>
        </div>
      </div>
    </li>
  )
}
