import type { CultureCode } from './schema.ts'

export interface Culture {
  code: CultureCode
  name: string
  // The flag lives in components/Flag.tsx; cultures without one show their code.
}

export const CULTURES: readonly Culture[] = [
  { code: 'PL', name: 'Poland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'NL', name: 'The Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'US', name: 'United States' },
]

export const MIN_CULTURES = 2
export const MAX_CULTURES = 6

export function getCulture(code: CultureCode): Culture {
  return CULTURES.find((c) => c.code === code)!
}
