import type { CSSProperties } from 'react'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'

/** Read-only chips showing which cultures are in play. */
export function CultureList({ cultures }: { cultures: CultureCode[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Cultures in this game">
      {cultures.map((code) => {
        const culture = getCulture(code)
        return (
          <li
            key={code}
            style={{ '--c': `var(${culture.colorVar})` } as CSSProperties}
            className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--c)_18%,transparent)] px-3 py-1.5 text-sm font-medium"
          >
            <span className="size-2.5 rounded-full bg-[var(--c)]" aria-hidden />
            {culture.name}
          </li>
        )
      })}
    </ul>
  )
}
