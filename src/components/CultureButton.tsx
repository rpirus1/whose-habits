import { Check } from 'lucide-react'
import { Flag } from '@/components/Flag'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'
import { cn } from '@/lib/utils'

/** A large answer button: flag and name. The choice is marked with the primary colour. */
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
      className={cn(
        'relative flex min-h-16 items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left text-lg leading-tight font-semibold transition-[transform,background-color,border-color] active:scale-[0.97]',
        selected ? 'border-primary bg-primary/15' : 'bg-card border-transparent',
        disabled && !selected && 'opacity-40',
      )}
    >
      <Flag code={code} className="size-7" />
      <span className="min-w-0 flex-1">{culture.name}</span>
      {selected && <Check className="text-primary absolute top-2 right-2 size-4" strokeWidth={3} />}
    </button>
  )
}
