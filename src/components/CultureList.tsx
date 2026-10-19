import { Flag } from '@/components/Flag'
import { getCulture } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'

/** Read-only chips showing which cultures are in play. */
export function CultureList({ cultures }: { cultures: CultureCode[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Cultures in this game">
      {cultures.map((code) => (
        <li
          key={code}
          className="bg-secondary flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-sm font-medium"
        >
          <Flag code={code} className="size-5" />
          {getCulture(code).name}
        </li>
      ))}
    </ul>
  )
}
