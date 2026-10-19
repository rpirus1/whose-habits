import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Page shell: phone-width column, safe-area padding, full dynamic viewport height. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </main>
  )
}
