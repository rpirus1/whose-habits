import { useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Logo, name and the Beta chip: one link home, the same on the lander and in the game.
 * With `leaveWarning` (a game is running), the link asks first in a small dialog.
 */
export function Brand({ className, leaveWarning }: { className?: string; leaveWarning?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()

  return (
    <>
      <Link
        to="/"
        aria-label="Whose Habits (beta), home"
        onClick={(e) => {
          if (!leaveWarning) return
          e.preventDefault()
          dialogRef.current?.showModal()
        }}
        className={cn(
          'font-heading focus-visible:ring-ring/50 -ml-1 flex items-center gap-2 rounded-lg px-1 text-lg font-bold outline-none focus-visible:ring-3',
          className,
        )}
      >
        <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
        Whose Habits
        <Badge variant="soft" className="ml-0.5 font-sans">
          Beta
        </Badge>
      </Link>

      {leaveWarning && (
        // Native <dialog>: focus stays inside, Escape closes it, no library needed.
        <dialog
          ref={dialogRef}
          aria-labelledby="leave-title"
          onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
          className="bg-popover text-popover-foreground ring-border backdrop:bg-background/70 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 shadow-xl ring-1 backdrop:backdrop-blur-[2px]"
        >
          <h2 id="leave-title" className="font-heading text-xl font-bold">
            Leave the game?
          </h2>
          <p className="text-muted-foreground mt-2">{leaveWarning}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button size="xl" autoFocus onClick={() => dialogRef.current?.close()}>
              Stay in the game
            </Button>
            <Button size="xl" variant="ghost" onClick={() => void navigate('/')}>
              Go to the home page
            </Button>
          </div>
        </dialog>
      )}
    </>
  )
}
