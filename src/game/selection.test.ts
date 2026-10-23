import { describe, expect, it } from 'vitest'
import { CULTURE_CODES } from '@/content/schema'
import { seededRandom } from './random'
import {
  eligibleStatements,
  maxPlayableRounds,
  pickReplacement,
  planGame,
  OPTIONS_PER_ROUND,
  RESERVE_SIZE,
  randomOptions,
  targetObviousness,
} from './selection'
import { byId, makeBank, makeStatement } from './testing'

describe('eligibleStatements', () => {
  const slippers = makeStatement(['PL', 'UA'])
  const nameDay = makeStatement(['PL'])
  const tipping = makeStatement(['US'])

  it('keeps statements where exactly one selected culture fits, with that culture as answer', () => {
    const result = eligibleStatements([slippers, nameDay, tipping], ['PL', 'BR'])
    expect(result.map((e) => [e.statement.id, e.answer])).toEqual([
      [slippers.id, 'PL'],
      [nameDay.id, 'PL'],
    ])
  })

  it('drops statements that fit two selected cultures', () => {
    const result = eligibleStatements([slippers, nameDay], ['PL', 'UA'])
    expect(result.map((e) => e.statement.id)).toEqual([nameDay.id])
  })

  it('reports how many rounds the pool supports', () => {
    expect(maxPlayableRounds(makeBank(['PL', 'UA'], 6), ['PL', 'UA'])).toBe(12 - RESERVE_SIZE)
    expect(maxPlayableRounds([], ['PL', 'UA'])).toBe(0)
  })
})

describe('targetObviousness', () => {
  it('ramps easy → medium → hard over the game', () => {
    const ramp = Array.from({ length: 9 }, (_, i) => targetObviousness(i, 9))
    expect(ramp).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3])
  })
})

describe('planGame', () => {
  const cultures = ['PL', 'NL', 'BR'] as const
  const bank = makeBank([...cultures], 12)
  const statements = byId(bank)
  const answerOf = (id: string) => statements.get(id)!.fits[0]

  it('returns every eligible statement once: plan first, reserve after', () => {
    const queue = planGame(bank, [...cultures], 15, seededRandom(1))
    expect(queue).toHaveLength(36)
    expect(new Set(queue).size).toBe(36)
  })

  it('balances correct answers across cultures', () => {
    const plan = planGame(bank, [...cultures], 15, seededRandom(2)).slice(0, 15)
    const counts = cultures.map((c) => plan.filter((id) => answerOf(id) === c).length)
    expect(counts).toEqual([5, 5, 5])
  })

  it('never repeats the same answer twice in a row', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planGame(bank, [...cultures], 15, seededRandom(seed)).slice(0, 15)
      for (let i = 1; i < plan.length; i++)
        expect(answerOf(plan[i])).not.toBe(answerOf(plan[i - 1]))
    }
  })

  it('ramps obviousness when the pool allows it', () => {
    const plan = planGame(bank, [...cultures], 9, seededRandom(3)).slice(0, 9)
    const levels = plan.map((id) => statements.get(id)!.obviousness)
    expect(levels).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3])
  })

  it('puts recently played statements last', () => {
    // 8 of 12 per culture were played recently; 4 fresh each is enough for 6 rounds.
    const recent = new Set(bank.filter((_, i) => i % 12 < 8).map((s) => s.id))
    const plan = planGame(bank, [...cultures], 6, seededRandom(4), recent).slice(0, 6)
    expect(plan.every((id) => !recent.has(id))).toBe(true)
  })

  it('is deterministic for a given seed', () => {
    expect(planGame(bank, [...cultures], 10, seededRandom(5))).toEqual(
      planGame(bank, [...cultures], 10, seededRandom(5)),
    )
  })

  it('returns a shorter plan when the pool is small', () => {
    expect(planGame(makeBank(['PL', 'UA'], 2), ['PL', 'UA'], 10, seededRandom(6))).toHaveLength(4)
  })
})

describe('pickReplacement', () => {
  const a = makeStatement(['PL'], 1)
  const b = makeStatement(['UA'], 2)
  const c = makeStatement(['PL'], 3)
  const d = makeStatement(['PL'], 2)
  const statements = byId([a, b, c, d])

  it('prefers the reserve statement with the same answer and closest obviousness', () => {
    // queue: [b] is still planned (1 round left), [c, d] are reserve
    const queue = [b.id, c.id, d.id]
    expect(pickReplacement(queue, 1, statements, ['PL', 'UA'], a, 'PL')).toBe(2) // d is closer than c
  })

  it('falls back to another culture when the reserve has none of the same answer', () => {
    expect(pickReplacement([a.id, b.id], 1, statements, ['PL', 'UA'], c, 'PL')).toBe(1)
  })

  it('returns -1 when the reserve is empty', () => {
    expect(pickReplacement([b.id], 1, statements, ['PL', 'UA'], a, 'PL')).toBe(-1)
  })
})

describe('random mode', () => {
  const multi = makeStatement(['UA', 'PL', 'TR', 'IT', 'FR'], 2, 'ua-900')

  it('uses every statement, answered by the culture it was written for', () => {
    const result = eligibleStatements([multi, makeStatement(['US'])], 'random')
    expect(result.map((e) => e.answer)).toEqual(['UA', 'US'])
  })

  it('shows 4 buttons, exactly one of them a culture the statement fits', () => {
    for (let seed = 0; seed < 30; seed++) {
      const options = randomOptions(multi, 'UA', seededRandom(seed))
      expect(options).toHaveLength(OPTIONS_PER_ROUND)
      expect(new Set(options).size).toBe(OPTIONS_PER_ROUND)
      expect(options.filter((c) => multi.fits.includes(c))).toEqual(['UA'])
      // Canonical order.
      expect(options).toEqual(CULTURE_CODES.filter((c) => options.includes(c)))
    }
  })

  it('plans from the whole pool, balanced across cultures', () => {
    const bank = makeBank([...CULTURE_CODES], 5)
    const plan = planGame(bank, 'random', 20, seededRandom(7)).slice(0, 20)
    const counts = new Map<string, number>()
    for (const id of plan) counts.set(id.slice(0, 2), (counts.get(id.slice(0, 2)) ?? 0) + 1)
    expect(counts.size).toBe(CULTURE_CODES.length)
    expect(Math.max(...counts.values())).toBe(2)
  })
})
