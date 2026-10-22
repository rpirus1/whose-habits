import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Top bar for every room screen: the logo (a link home) on the left, a menu button on the right.
 * The menu opens as a panel over the page (the game doesn't move) and closes on a tap
 * outside it, on Escape, or on the button again. `menu` gets a close function so an
 * action like "End game" can shut it.
 */
export function AppBar({
  menu,
  menuLabel = 'Menu',
  dot = false,
  leaveWarning,
}: {
  menu: (close: () => void) => ReactNode
  menuLabel?: string
  /** A small dot on the button, e.g. while the game is paused. */
  dot?: boolean
  /** While a game runs: the logo link asks before leaving, with this explanation. */
  leaveWarning?: string
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

  return (
    // Sticky, and pulled up over Screen's top padding so its background reaches the top edge
    // (Safari tints the status bar from it). z-20 keeps it and its menu above the page.
    <header className="bg-background sticky top-0 z-20 -mx-4 -mt-[max(1.5rem,env(safe-area-inset-top))] px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex h-12 items-center justify-between">
        <Brand leaveWarning={leaveWarning} />
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon-lg"
          className={cn('relative -mr-2', open && 'bg-muted')}
          aria-label={menuLabel}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal className="size-5" />
          {dot && (
            <span
              className="bg-primary ring-background absolute top-2 right-2 size-2.5 rounded-full ring-2"
              aria-hidden
            />
          )}
        </Button>
      </div>

      {open && (
        <>
          {/* Behind the bar (-z-10 inside its stacking context) but above the page. */}
          <div
            className="bg-background/70 fixed inset-0 -z-10 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={menuLabel}
            tabIndex={-1}
            className={cn(
              'bg-popover text-popover-foreground ring-border absolute inset-x-4 top-full flex flex-col gap-5 overflow-y-auto overscroll-contain rounded-2xl p-4 shadow-xl ring-1 outline-none',
              // Fits under the bar on any phone; long menus (lobby settings) scroll inside.
              'max-h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top))-4rem)]',
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-150',
            )}
          >
            {menu(close)}
          </div>
        </>
      )}
    </header>
  )
}
