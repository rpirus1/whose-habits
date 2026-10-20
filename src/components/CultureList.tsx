import { Flag } from '@/components/Flag'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'

/** Read-only chips showing which cultures are in play. */
export function CultureList({ cultures }: { cultures: CultureCode[] }) {
  return (
    <ul
      className="flex flex-wrap justify-center gap-x-4 gap-y-1"
      aria-label="Countries in this game"
    >
      {cultures.map((code) => (
        <li key={code} className="flex items-center gap-2 py-1 text-sm font-medium">
          <Flag code={code} className="size-5" />
          {getCulture(code).name}
        </li>
      ))}
    </ul>
  )
}
