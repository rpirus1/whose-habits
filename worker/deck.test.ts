import { describe, expect, it } from 'vitest'
import { seededRandom } from '../src/game/random'
import { DECK_RESERVE_PER_CULTURE, eligibleStatements } from '../src/game/selection'
import { makeBank } from '../src/game/testing'
import { ROUND_OPTIONS } from '../src/game/types'
import { deal, MAX_RECENT_IDS, MAX_ROUNDS, parseDeckRequest } from './deck'

const bank = makeBank(['PL', 'UA', 'NL', 'BR'], 12)

describe('parseDeckRequest', () => {
  it('accepts the setup screen’s options', () => {
    expect(parseDeckRequest({ countries: ['PL', 'UA'], rounds: 10, recentIds: [] })).toEqual({
      countries: ['PL', 'UA'],
      rounds: 10,
      recentIds: [],
    })
    expect(parseDeckRequest({ countries: 'random', rounds: 20, recentIds: ['pl-001'] })).toEqual({
      countries: 'random',
      rounds: 20,
      recentIds: ['pl-001'],
    })
  })

  it('caps rounds at the largest option', () => {
    expect(MAX_ROUNDS).toBe(Math.max(...ROUND_OPTIONS))
    expect(parseDeckRequest({ countries: 'random', rounds: MAX_ROUNDS + 1, recentIds: [] })).toBe(
      null,
    )
  })

  it('rejects anything else', () => {
    for (const bad of [
      null,
      'random',
      { countries: ['PL'], rounds: 10, recentIds: [] },
      { countries: ['PL', 'PL'], rounds: 10, recentIds: [] },
      { countries: ['PL', 'XX'], rounds: 10, recentIds: [] },
      { countries: ['PL', 'UA', 'NL', 'BR', 'MX', 'US', 'TR'], rounds: 10, recentIds: [] },
      { countries: ['PL', 'UA'], rounds: 0, recentIds: [] },
      { countries: ['PL', 'UA'], rounds: 2.5, recentIds: [] },
      { countries: ['PL', 'UA'], rounds: 10 },
      { countries: ['PL', 'UA'], rounds: 10, recentIds: [7] },
      { countries: ['PL', 'UA'], rounds: 10, recentIds: ['x'.repeat(17)] },
    ])
      expect(parseDeckRequest(bad)).toBe(null)
  })

  it('keeps only the recent ids the app stores', () => {
    const recentIds = Array.from({ length: MAX_RECENT_IDS + 50 }, (_, i) => `pl-${i}`)
    expect(
      parseDeckRequest({ countries: 'random', rounds: 10, recentIds })!.recentIds,
    ).toHaveLength(MAX_RECENT_IDS)
  })
})

describe('deal', () => {
  it('returns the planned rounds plus a small reserve per answer culture, not the bank', () => {
    const { statements } = deal(
      bank,
      { countries: ['PL', 'UA'], rounds: 10, recentIds: [] },
      seededRandom(1),
    )
    expect(statements).toHaveLength(10 + 2 * DECK_RESERVE_PER_CULTURE)
    expect(new Set(statements.map((s) => s.id)).size).toBe(statements.length)
    // Every statement fits the game's countries.
    expect(eligibleStatements(statements, ['PL', 'UA'])).toHaveLength(statements.length)
  })

  it('deals statements this device played recently last', () => {
    const recentIds = bank
      .filter((s) => s.fits[0] === 'PL')
      .map((s) => s.id)
      .slice(0, 8)
    const { statements } = deal(
      bank,
      { countries: ['PL', 'UA'], rounds: 10, recentIds },
      seededRandom(2),
    )
    const recent = new Set(recentIds)
    // 12 PL statements, 8 recent: the 4 fresh ones come first and fill PL's 5 rounds with 1 recent.
    expect(statements.slice(0, 10).filter((s) => recent.has(s.id))).toHaveLength(1)
  })
})
