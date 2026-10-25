// Test helpers (not imported by the app).
import type { CultureCode, Obviousness, Statement } from '@/content/schema'
import { reduce, type Action } from './engine'
import type { EngineContext, GameState } from './types'

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
    topic: 'home',
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

/**
 * reduce(), except that a Next which starts the countdown also waits it out, so tests about what
 * comes after Next don't each have to. The countdown has its own tests in engine.test.ts.
 */
export function reduceThroughCountdown(state: GameState, action: Action, ctx: EngineContext) {
  const next = reduce(state, action, ctx)
  if (action.type !== 'next' || next.nextAt == null || state.nextAt != null) return next
  ctx.now = next.nextAt
  return reduce(next, { type: 'tick' }, ctx)
}
