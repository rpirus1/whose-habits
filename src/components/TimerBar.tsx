import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const URGENT_MS = 5000

export function TimerBar({
  msLeft,
  totalMs,
  paused,
  onResume,
}: {
  msLeft: number
  totalMs: number
  paused: boolean
  /** Host only: while paused, the icon becomes a Play button that resumes the game. */
  onResume?: () => void
}) {
  const fraction = totalMs ? Math.min(1, msLeft / totalMs) : 0
  const urgent = msLeft <= URGENT_MS && msLeft > 0 && !paused

  return (
    <div className="flex items-center gap-3">
      <div
        className="bg-muted h-3 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Time left"
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={Math.ceil(msLeft / 1000)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-100 ease-linear',
            urgent ? 'bg-destructive' : 'bg-primary',
            // Frozen, not just slow: dim the bar while the host has paused.
            paused && 'opacity-40',
          )}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className={cn(
          'flex w-10 justify-end text-xl font-bold tabular-nums',
          urgent && 'text-destructive',
        )}
      >
        {paused && onResume ? (
          // The thing the host taps instinctively: make it work, in the accent colour.
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume game"
            className="bg-primary text-primary-foreground focus-visible:ring-ring/50 -my-1.5 flex size-10 items-center justify-center rounded-full outline-none focus-visible:ring-3"
          >
            <Play className="size-5 translate-x-px fill-current" />
          </button>
        ) : paused ? (
          // An icon, not the ⏸ emoji, so it looks the same on every phone.
          <Pause className="text-muted-foreground size-5 fill-current" aria-label="Paused" />
        ) : (
          Math.ceil(msLeft / 1000)
        )}
      </span>
    </div>
  )
}
