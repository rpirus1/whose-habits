import type { ComponentProps, ReactNode } from 'react'
import { BR, MX, NL, PL, UA, US } from 'country-flag-icons/react/1x1'
import type { CultureCode } from '@/content/schema'
import { cn } from '@/lib/utils'

// Square flags from country-flag-icons (MIT), cropped to a circle. A culture without an
// entry here (e.g. a region) falls back to its code on a neutral disc.
const FLAGS: Partial<Record<CultureCode, (props: ComponentProps<typeof PL>) => ReactNode>> = {
  PL,
  UA,
  NL,
  BR,
  MX,
  US,
}

/** A round flag. Size it with className (default size-6). Decorative: pair it with the name. */
export function Flag({ code, className }: { code: CultureCode; className?: string }) {
  const Svg = FLAGS[code]
  return (
    <span
      aria-hidden
      className={cn(
        'bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.6rem] font-semibold ring-1 ring-foreground/15',
        className,
      )}
    >
      {Svg ? <Svg className="size-full" /> : code}
    </span>
  )
}
