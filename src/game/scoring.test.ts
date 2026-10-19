import { describe, expect, it } from 'vitest'
import { percentCorrect, scoreRound } from './scoring'
import type { Player, Round } from './types'

const player = (id: string): Player => ({
  id,
  name: id,
  score: 0,
  connected: true,
  isHost: false,
  playsFrom: 0,
})
const players = ['ann', 'bob', 'cat', 'dan'].map(player)

const round = (answers: Round['answers']): Round => ({
  id: 'r0',
  index: 0,
  statementId: 'nl-001',
  answer: 'NL',
  answers,
  result: null,
})

describe('scoreRound', () => {
  it('gives 1 point per correct answer and a bonus to the earliest correct one', () => {
    const result = scoreRound(
      round({
        ann: { choice: 'NL', at: 300 },
        bob: { choice: 'NL', at: 100 },
        cat: { choice: 'PL', at: 50 },
        dan: { choice: 'unknown', at: 60 },
      }),
      players,
    )
    expect(result.points).toEqual({ ann: 1, bob: 2 })
    expect(result.bonusId).toBe('bob')
    expect(result.correctIds).toEqual(['bob', 'ann'])
    expect(result.split).toEqual({ NL: 2, PL: 1, unknown: 1 })
  })

  it('gives no bonus when nobody is right', () => {
    const result = scoreRound(round({ ann: { choice: 'PL', at: 1 } }), players)
    expect(result).toMatchObject({ bonusId: null, points: {}, correctIds: [] })
  })

  it('breaks exact ties by join order', () => {
    const result = scoreRound(
      round({ cat: { choice: 'NL', at: 100 }, bob: { choice: 'NL', at: 100 } }),
      players,
    )
    expect(result.bonusId).toBe('bob')
  })
})

describe('percentCorrect', () => {
  it('counts "I don\'t know" as answered', () => {
    const r = round({ ann: { choice: 'NL', at: 1 }, bob: { choice: 'unknown', at: 2 } })
    r.result = scoreRound(r, players)
    expect(percentCorrect(r)).toBe(0.5)
  })
})
