import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Main action pinned to the bottom of the screen. The strip of background below the button
 * matters: Safari tints its toolbar from whatever touches the bottom edge, so the edge must
 * be background, not the orange button. The negative margin cancels Screen's own bottom
 * padding, so the spacing at the end of the page stays the same.
 * Above the button, content fades and blurs out (.footer-fade in index.css), a hint that
 * the page scrolls on under it.
 */
export function StickyFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'footer-fade sticky bottom-0 mt-auto -mb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  )
}
