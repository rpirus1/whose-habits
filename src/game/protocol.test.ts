import { describe, expect, it } from 'vitest'
import { createGame, reduce } from './engine'
import type { Action } from './engine'
import { finalSummary, parseGuestMessage, toSnapshot } from './protocol'
import { seededRandom } from './random'
import { byId, makeBank } from './testing'
import type { EngineContext, GameState } from './types'

const bank = makeBank(['PL', 'NL'], 12)
const statements = byId(bank)

function started() {
  const ctx: EngineContext = { now: 1000, statements, random: seededRandom(7) }
  let s: GameState = createGame({
    roomCode: 'BCDF',
    hostId: 'host',
    settings: { cultures: ['PL', 'NL'], rounds: 10, seconds: 20 },
  })
  const run = (a: Action) => (s = reduce(s, a, ctx))
  run({ type: 'join', playerId: 'ann', name: 'Ann' })
  run({ type: 'start', gameId: 'g1' })
  return {
    run,
    get s() {
      return s
    },
  }
}

describe('toSnapshot', () => {
  it('never includes the correct answer or note during a question', () => {
    const g = started()
    const snap = toSnapshot(g.s, statements, 1)
    expect(snap.question).toMatchObject({ index: 0, total: 10, answeredIds: [] })
    expect(snap.reveal).toBeNull()
    const json = JSON.stringify(snap)
    const statement = statements.get(g.s.rounds[0].statementId)!
    expect(json).not.toContain(statement.note)
    expect(json).not.toContain('"answer"')
  })

  it('shows who answered, not what they chose', () => {
    const g = started()
    g.run({ type: 'answer', playerId: 'ann', roundId: g.s.rounds[0].id, choice: 'PL' })
    const snap = toSnapshot(g.s, statements, 2)
    expect(snap.question!.answeredIds).toEqual(['ann'])
    expect(JSON.stringify(snap.question)).not.toContain('"PL"')
  })

  it("includes the reveal with everyone's choices after the round", () => {
    const g = started()
    const round = g.s.rounds[0]
    g.run({ type: 'answer', playerId: 'ann', roundId: round.id, choice: round.answer })
    g.run({ type: 'answer', playerId: 'host', roundId: round.id, choice: 'unknown' })
    const snap = toSnapshot(g.s, statements, 3)
    expect(snap.phase).toBe('reveal')
    expect(snap.reveal).toMatchObject({
      answer: round.answer,
      note: statements.get(round.statementId)!.note,
      choices: { ann: round.answer, host: 'unknown' },
      bonusId: 'ann',
    })
  })

  it('shows the earlier reveal and the paused question when the host goes back', () => {
    const g = started()
    const first = g.s.rounds[0]
    g.run({ type: 'answer', playerId: 'ann', roundId: first.id, choice: first.answer })
    g.run({ type: 'answer', playerId: 'host', roundId: first.id, choice: first.answer })
    g.run({ type: 'next' })
    g.run({ type: 'back' })
    const snap = toSnapshot(g.s, statements, 4)
    expect(snap).toMatchObject({ phase: 'question', viewing: true, paused: true })
    expect(snap.reveal!.index).toBe(0)
    expect(snap.question!.index).toBe(1)
  })
})

describe('finalSummary', () => {
  it('ranks with shared places and lists the least-guessed statements first', () => {
    const g = started()
    for (let i = 0; i < 4; i++) {
      const r = g.s.rounds.at(-1)!
      const wrong = r.answer === 'PL' ? 'NL' : 'PL'
      g.run({ type: 'answer', playerId: 'ann', roundId: r.id, choice: i < 2 ? r.answer : wrong })
      g.run({ type: 'answer', playerId: 'host', roundId: r.id, choice: i === 0 ? r.answer : wrong })
      g.run({ type: 'next' })
    }
    g.run({ type: 'end' })
    const summary = finalSummary(g.s, statements)
    expect(summary.roundsPlayed).toBe(4)
    expect(summary.ranking).toEqual([
      { id: 'ann', rank: 1 },
      { id: 'host', rank: 2 },
    ])
    expect(summary.surprising.map((x) => x.percentCorrect)).toEqual([0, 0, 0.5])
  })
})

describe('parseGuestMessage', () => {
  it('accepts well-formed messages', () => {
    expect(parseGuestMessage({ type: 'hello', playerId: 'p', name: 'Ann' })).toEqual({
      type: 'hello',
      playerId: 'p',
      name: 'Ann',
    })
    expect(parseGuestMessage({ type: 'ping', playerId: 'p', t0: 5 })).toMatchObject({ t0: 5 })
    expect(parseGuestMessage({ type: 'leave', playerId: 'p' })).toEqual({
      type: 'leave',
      playerId: 'p',
    })
  })

  it('rejects junk', () => {
    for (const bad of [
      null,
      'hello',
      { type: 'hello', name: 'no id' },
      { type: 'hello', playerId: 'p', name: 'x'.repeat(500) },
      { type: 'answer', playerId: 'p', roundId: 1, choice: 'PL' },
      { type: 'ping', playerId: 'p', t0: 'soon' },
      { type: 'state', playerId: 'p' },
    ]) {
      expect(parseGuestMessage(bad)).toBeNull()
    }
  })
})
