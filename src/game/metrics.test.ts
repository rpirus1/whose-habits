import { describe, expect, it } from 'vitest'
import { parseEvent, statementVersion } from '@/lib/events'
import { createGame, currentRound } from './engine'
import type { Action } from './engine'
import { statementEvents } from './metrics'
import { seededRandom } from './random'
import { byId, makeBank, reduceThroughCountdown } from './testing'
import { REPORT_HOLD_MS } from './types'
import type { EngineContext, GameState } from './types'

const bank = makeBank(['PL', 'NL'], 12)
const statements = byId(bank)
const gameId = '0b9c3a52-7d1e-4f6a-9c2b-1e2d3f4a5b6c'

function play() {
  const ctx: EngineContext = { now: 1_000_000, statements, random: seededRandom(7) }
  let s: GameState = createGame({
    roomCode: 'BCDF',
    hostId: 'host',
    hostName: '',
    settings: { cultures: ['PL', 'NL'], rounds: 10, seconds: 20 },
  })
  const run = (action: Action) => (s = reduceThroughCountdown(s, action, ctx))
  for (const id of ['ann', 'bob']) run({ type: 'join', playerId: id, name: id })
  run({ type: 'start', gameId })
  const answer = (choices: Record<string, string>) => {
    const round = currentRound(s)!
    for (const [playerId, c] of Object.entries(choices)) {
      const choice =
        c === 'right'
          ? round.answer
          : c === 'wrong'
            ? round.answer === 'PL'
              ? 'NL'
              : 'PL'
            : 'unknown'
      run({ type: 'answer', playerId, roundId: round.id, choice })
    }
  }
  return {
    ctx,
    run,
    answer,
    get s() {
      return s
    },
  }
}

const events = (s: GameState) => statementEvents(s, statements)

describe('statementEvents', () => {
  it('sends one round_result per revealed round, with the room split and version', () => {
    const g = play()
    expect(events(g.s)).toEqual([]) // question still open
    g.answer({ host: 'right', ann: 'wrong', bob: 'unknown' })
    const round = currentRound(g.s)!
    const [first] = events(g.s)
    const wrong = round.answer === 'PL' ? 'NL' : 'PL'
    expect(first.event).toEqual({
      type: 'round_result',
      gameId,
      statementId: round.statementId,
      v: statementVersion(statements.get(round.statementId)!),
      answer: round.answer,
      split: { [round.answer]: 1, [wrong]: 1, unknown: 1 },
    })
    expect(parseEvent(first.event)).toEqual(first.event)
  })

  it('records statements replaced by Skip and by everyone "I don\'t know"', () => {
    const g = play()
    const skipped = currentRound(g.s)!.statementId
    g.run({ type: 'skip' })
    const unknown = currentRound(g.s)!.statementId
    g.answer({ host: 'unknown', ann: 'unknown', bob: 'unknown' })
    const replaced = events(g.s).filter((e) => e.event.type === 'statement_replaced')
    expect(replaced.map((e) => e.event)).toMatchObject([
      { statementId: skipped, why: 'skip' },
      { statementId: unknown, why: 'unknown' },
    ])
    expect(new Set(replaced.map((e) => e.key)).size).toBe(2)
  })

  it('sends reports when their hold ends, with hold time and the reporter count', () => {
    const g = play()
    g.answer({ host: 'right', ann: 'right', bob: 'right' })
    const statementId = currentRound(g.s)!.statementId
    g.run({ type: 'reportOpen', playerId: 'ann', statementId })
    expect(events(g.s).some((e) => e.event.type === 'report')).toBe(false) // still on hold
    g.ctx.now += 3_000
    g.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'not_unique' })
    g.run({ type: 'reportOpen', playerId: 'bob', statementId })
    g.ctx.now += REPORT_HOLD_MS
    g.run({ type: 'tick' })

    const reports = events(g.s).filter((e) => e.event.type === 'report')
    expect(reports.map((e) => e.event)).toMatchObject([
      { reason: 'not_unique', heldMs: 3_000, nth: 1 },
      { reason: 'none', heldMs: REPORT_HOLD_MS, nth: 1 },
    ])
    for (const r of reports) {
      expect(JSON.stringify(r.event)).not.toMatch(/ann|bob/)
      expect(parseEvent(r.event)).toEqual(r.event)
    }
  })

  it('counts a second report by the same player as nth 2', () => {
    const g = play()
    g.answer({ host: 'right', ann: 'right', bob: 'right' })
    const first = currentRound(g.s)!.statementId
    g.run({ type: 'reportDone', playerId: 'ann', statementId: first, reason: 'incorrect' })
    g.run({ type: 'next' })
    g.answer({ host: 'right', ann: 'right', bob: 'right' })
    const second = currentRound(g.s)!.statementId
    g.run({ type: 'reportDone', playerId: 'ann', statementId: second, reason: 'outdated' })
    const nths = events(g.s)
      .filter((e) => e.event.type === 'report')
      .map((e) => (e.event as { nth?: number }).nth)
    expect(nths).toEqual([1, 2])
  })
})
