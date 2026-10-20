import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Main action pinned to the bottom of the screen. The strip of background below the button
 * matters: Safari tints its toolbar from whatever touches the bottom edge, so the edge must
 * be background, not the orange button. The negative margin cancels Screen's own bottom
 * padding, so the spacing at the end of the page stays the same.
 */
export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-background sticky bottom-0 mt-auto -mb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  )
}
