import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Flag } from '@/components/Flag'
import type { Culture } from '@/content/cultures'
import { useHydrated, useReducedMotion } from './useHydrated'

/** Pixels per second. Slow enough to read the names as they pass. */
const SPEED = 18
/** After a swipe, wait this long before drifting again. */
const RESUME_AFTER_MS = 3000

/**
 * Phones: the countries in one line that drifts slowly and can be swiped. The list is in the
 * page twice (the copy is hidden from screen readers) so the drift can loop without a jump.
 * Drift stays off with reduced motion, and the pause button stops it for good (WCAG 2.2.2).
 * Before JS loads it's a plain swipeable row.
 */
export function CountryCarousel({ countries }: { countries: readonly Culture[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const firstSet = useRef<HTMLUListElement>(null)
  const hydrated = useHydrated()
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const el = scroller.current
    const set = firstSet.current
    if (!el || !set || paused || reducedMotion) return

    let pos = el.scrollLeft
    let last = performance.now()
    let holdUntil = 0
    let visible = true
    let frame = 0

    // One loop = the width of the first set plus the gap before the copy.
    const loopWidth = () =>
      set.offsetWidth + parseFloat(getComputedStyle(set.parentElement!).columnGap || '0')
    const hold = () => (holdUntil = performance.now() + RESUME_AFTER_MS)

    const tick = (now: number) => {
      // Capped, so a long stall (a background tab) never jumps far.
      const dt = Math.min(now - last, 1000) / 1000
      last = now
      if (visible && now > holdUntil) {
        pos += SPEED * dt
        const loop = loopWidth()
        if (pos >= loop) pos -= loop
        el.scrollLeft = Math.round(pos)
      }
      frame = requestAnimationFrame(tick)
    }

    // A swipe moves scrollLeft away from where we put it: follow it, then wait a bit.
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - Math.round(pos)) <= 2) return
      const loop = loopWidth()
      if (el.scrollLeft >= loop) el.scrollLeft -= loop
      pos = el.scrollLeft
      hold()
    }

    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    observer.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('pointerdown', hold)
    el.addEventListener('focusin', hold)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('pointerdown', hold)
      el.removeEventListener('focusin', hold)
    }
  }, [paused, reducedMotion])

  return (
    <div className="flex flex-col gap-3">
      {/* Focusable, so the row can be scrolled with arrow keys; focus also pauses the drift. */}
      <div
        ref={scroller}
        role="region"
        aria-label="Countries in the game"
        tabIndex={0}
        className="lander-carousel focus-visible:ring-ring/50 -mx-4 overflow-x-auto rounded-full px-4 outline-none focus-visible:ring-3"
      >
        <div className="flex w-max gap-2 py-1">
          <ul ref={firstSet} className="flex gap-2">
            {countries.map((c) => (
              <Chip key={c.code} culture={c} />
            ))}
          </ul>
          <ul className="flex gap-2" aria-hidden>
            {countries.map((c) => (
              <Chip key={c.code} culture={c} />
            ))}
          </ul>
        </div>
      </div>
      {hydrated && !reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-2 self-start text-sm font-medium"
        >
          {paused ? (
            <Play className="size-4" aria-hidden />
          ) : (
            <Pause className="size-4" aria-hidden />
          )}
          {paused ? 'Play' : 'Pause'} scrolling
        </button>
      )}
    </div>
  )
}

function Chip({ culture }: { culture: Culture }) {
  return (
    <li className="bg-card ring-border flex shrink-0 items-center gap-2.5 rounded-full py-2 pr-4 pl-2 text-base font-medium ring-1">
      <Flag code={culture.code} className="size-7" />
      {culture.name}
    </li>
  )
}
