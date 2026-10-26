// The host's phone gets each game's statements from the Worker (/api/deck, worker/deck.ts):
// the bank isn't in the app, so it can't be downloaded from the site.
import { CULTURE_CODES } from '@/content/schema'
import type { Statement } from '@/content/schema'
import type { Countries } from '@/game/selection'

export async function fetchDeck(request: {
  countries: Countries
  rounds: number
  recentIds: string[]
}): Promise<Statement[]> {
  const response = await fetch('/api/deck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(`deck: HTTP ${response.status}`)
  const body: unknown = await response.json()
  const statements = (body as { statements?: unknown }).statements
  if (!Array.isArray(statements) || !statements.every(isStatement)) {
    throw new Error('deck: unexpected response')
  }
  return statements
}

function isStatement(s: unknown): s is Statement {
  if (typeof s !== 'object' || s === null) return false
  const { id, text, note, fits, obviousness } = s as Record<string, unknown>
  return (
    typeof id === 'string' &&
    typeof text === 'string' &&
    typeof note === 'string' &&
    Array.isArray(fits) &&
    fits.length > 0 &&
    fits.every((c) => (CULTURE_CODES as readonly unknown[]).includes(c)) &&
    (obviousness === 1 || obviousness === 2 || obviousness === 3)
  )
}
