import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { REPORT_HOLD_MS, REPORT_REASONS } from '@/game/types'
import type { ReportReason } from '@/game/types'
import { useCountdown } from '@/hooks/useCountdown'

const LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  incorrect: 'Incorrect',
  outdated: 'Outdated',
  not_unique: 'Fits more countries',
  offensive: 'Unfair or offensive',
}

/**
 * The reporter's pop-up: four reasons and a 10-second countdown while the game holds for
 * everyone. Closing it, Escape, a backdrop tap or the timeout all count as 'none'.
 */
export function ReportDialog({ onDone }: { onDone: (reason: ReportReason) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const doneRef = useRef(false)
  const [endsAt] = useState(() => Date.now() + REPORT_HOLD_MS)
  const left = useCountdown(endsAt, null, 0)

  const finish = (reason: ReportReason) => {
    if (doneRef.current) return
    doneRef.current = true
    dialogRef.current?.close()
    onDone(reason)
  }

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    if (left <= 0) finish('none')
  })

  return (
    // Native <dialog>, like the leave dialog: focus stays inside, Escape closes it.
    <dialog
      ref={dialogRef}
      aria-labelledby="report-title"
      aria-describedby="report-hint"
      onClose={() => finish('none')}
      onClick={(e) => e.target === dialogRef.current && finish('none')}
      className="bg-popover text-popover-foreground ring-border backdrop:bg-background/70 m-auto w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl shadow-xl ring-1 backdrop:backdrop-blur-[2px]"
    >
      <div
        className="bg-primary h-1 origin-left transition-transform duration-100 ease-linear"
        style={{ transform: `scaleX(${left / REPORT_HOLD_MS})` }}
        aria-hidden
      />
      <div className="p-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="report-title" className="font-heading text-xl font-bold">
            What’s wrong with it?
          </h2>
          <Button
            variant="ghost"
            size="icon-lg"
            className="-mt-1 -mr-2"
            aria-label="Close without a reason"
            onClick={() => finish('none')}
          >
            <X />
          </Button>
        </div>
        <p id="report-hint" className="text-muted-foreground mt-1 text-sm" aria-live="off">
          The game waits for you: {Math.ceil(left / 1000)} s
        </p>
        {/* One column: every label fits on one line, and a list reads top to bottom. */}
        <div className="mt-4 flex flex-col gap-2">
          {REPORT_REASONS.map((reason, i) => (
            <Button
              key={reason}
              size="xl"
              className="w-full"
              variant="outline"
              autoFocus={i === 0}
              onClick={() => finish(reason)}
            >
              {LABELS[reason]}
            </Button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
