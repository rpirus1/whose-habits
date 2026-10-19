// Test helpers (not imported by the app).
import type { CultureCode, Obviousness, Statement } from '@/content/schema'

let counter = 0

export function makeStatement(
  fits: CultureCode[],
  obviousness: Obviousness = 2,
  id = `${fits[0].toLowerCase()}-${String(++counter).padStart(3, '0')}`,
): Statement {
  return {
    id,
    text: `Statement ${id}`,
    fits,
    note: `Note for ${id}`,
    obviousness,
    topic: 'daily',
    reviewed: true,
  }
}

/** n statements per culture, obviousness cycling 1, 2, 3. */
export function makeBank(cultures: CultureCode[], perCulture: number): Statement[] {
  return cultures.flatMap((c) =>
    Array.from({ length: perCulture }, (_, i) => makeStatement([c], ((i % 3) + 1) as Obviousness)),
  )
}

export const byId = (statements: Statement[]) => new Map(statements.map((s) => [s.id, s]))
