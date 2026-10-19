import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'
import { cn } from '@/lib/utils'

/** A large answer button in the culture's colour. */
export function CultureButton({
  code,
  selected,
  disabled,
  onClick,
}: {
  code: CultureCode
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const culture = getCulture(code)
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={{ '--c': `var(${culture.colorVar})` } as CSSProperties}
      className={cn(
        'relative flex min-h-16 items-center justify-center rounded-2xl border-2 border-[var(--c)] px-3 py-2 text-center text-lg leading-tight font-semibold transition-[transform,background-color] active:scale-[0.97]',
        selected
          ? 'bg-[var(--c)] text-[oklch(0.18_0.02_270)]'
          : 'bg-[color-mix(in_oklch,var(--c)_14%,transparent)]',
        disabled && !selected && 'opacity-40',
      )}
    >
      {culture.name}
      {selected && <Check className="absolute top-2 right-2 size-4" strokeWidth={3} />}
    </button>
  )
}
