import type { CultureCode } from './schema.ts'

export interface Culture {
  code: CultureCode
  name: string
  /** CSS variable from index.css; also available as Tailwind colour `culture-<code>`. */
  colorVar: string
}

export const CULTURES: readonly Culture[] = [
  { code: 'PL', name: 'Poland', colorVar: '--culture-pl' },
  { code: 'UA', name: 'Ukraine', colorVar: '--culture-ua' },
  { code: 'NL', name: 'The Netherlands', colorVar: '--culture-nl' },
  { code: 'BR', name: 'Brazil', colorVar: '--culture-br' },
  { code: 'MX', name: 'Mexico', colorVar: '--culture-mx' },
  { code: 'US', name: 'United States', colorVar: '--culture-us' },
]

export const MIN_CULTURES = 2
export const MAX_CULTURES = 6

export function getCulture(code: CultureCode): Culture {
  return CULTURES.find((c) => c.code === code)!
}
