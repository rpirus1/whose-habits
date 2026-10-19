import type { CSSProperties } from 'react'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'
import type { Choice } from '@/game/types'
import { cn } from '@/lib/utils'

/** How the room split: one bar per option, the correct one highlighted. */
export function SplitBars({
  cultures,
  split,
  answer,
}: {
  cultures: CultureCode[]
  split: Partial<Record<Choice, number>>
  answer: CultureCode
}) {
  const total = Object.values(split).reduce((a, b) => a + (b ?? 0), 0)
  const rows: { key: Choice; label: string; colorVar?: string }[] = [
    ...cultures.map((code) => ({
      key: code,
      label: getCulture(code).name,
      colorVar: getCulture(code).colorVar,
    })),
    ...(split.unknown ? [{ key: 'unknown' as const, label: "Didn't know" }] : []),
  ]

  return (
    <ul className="flex flex-col gap-2" aria-label="How the room answered">
      {rows.map(({ key, label, colorVar }) => {
        const count = split[key] ?? 0
        const correct = key === answer
        return (
          <li
            key={key}
            style={
              { '--c': colorVar ? `var(${colorVar})` : 'var(--muted-foreground)' } as CSSProperties
            }
            className="flex items-center gap-3"
          >
            <span
              className={cn(
                'w-28 shrink-0 truncate text-sm',
                correct ? 'font-semibold' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            <span className="bg-muted relative h-7 flex-1 overflow-hidden rounded-lg">
              <span
                className={cn(
                  'absolute inset-y-0 left-0 rounded-lg bg-[var(--c)]',
                  !correct && 'opacity-40',
                )}
                style={{ width: total ? `${(count / total) * 100}%` : 0 }}
              />
            </span>
            <span className="w-6 text-right tabular-nums">{count}</span>
          </li>
        )
      })}
    </ul>
  )
}
