// POST /api/deck: one game's statements, dealt from the bank that lives only in the Worker
// (worker/statements.json, written by `npm run content`). The host's phone asks for a deck in
// the lobby and plans the game from it, so nobody can download the whole bank from the site.
// Pure, so the Vite dev server can answer the same route (vite.config.ts) and tests need no
// Worker. Relative imports only: the Worker bundles this file.
import { CULTURE_CODES } from '../src/content/schema'
import type { Statement } from '../src/content/schema'
import { MAX_CULTURES, MIN_CULTURES } from '../src/content/cultures'
import { dealDeck } from '../src/game/selection'
import type { Countries } from '../src/game/selection'

/** The app keeps this many recent ids (RECENT_LIMIT in useHostGame); more are ignored. */
export const MAX_RECENT_IDS = 150
export const MAX_DECK_REQUEST_BYTES = 4096

export interface DeckRequest {
  countries: Countries
  rounds: number
  /** Statements this device played recently: the deal puts them last. */
  recentIds: string[]
}

export interface DeckResponse {
  statements: Statement[]
}

/** The largest of ROUND_OPTIONS (src/game/types.ts, which the Worker can't import); a test checks. */
export const MAX_ROUNDS = 20

/** A valid request, or null. Only the setup screen's own options pass. */
export function parseDeckRequest(input: unknown): DeckRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const { countries, rounds, recentIds } = input as Record<string, unknown>
  if (!Number.isInteger(rounds) || (rounds as number) < 1 || (rounds as number) > MAX_ROUNDS)
    return null
  if (
    !Array.isArray(recentIds) ||
    !recentIds.every((id) => typeof id === 'string' && id.length <= 16)
  )
    return null
  let parsed: Countries
  if (countries === 'random') parsed = 'random'
  else if (
    Array.isArray(countries) &&
    new Set(countries).size === countries.length &&
    countries.length >= MIN_CULTURES &&
    countries.length <= MAX_CULTURES &&
    countries.every((c) => (CULTURE_CODES as readonly unknown[]).includes(c))
  )
    parsed = countries
  else return null
  return {
    countries: parsed,
    rounds: rounds as number,
    recentIds: recentIds.slice(0, MAX_RECENT_IDS),
  }
}

export function deal(
  bank: readonly Statement[],
  request: DeckRequest,
  random: () => number,
): DeckResponse {
  return {
    statements: dealDeck(
      bank,
      request.countries,
      request.rounds,
      random,
      new Set(request.recentIds),
    ),
  }
}
