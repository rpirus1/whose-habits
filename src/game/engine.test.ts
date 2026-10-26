import { describe, expect, it } from 'vitest'
import { CULTURE_CODES } from '@/content/schema'
import { createGame, currentRound, joinRejection, openReports, reduce } from './engine'
import type { Action } from './engine'
import { seededRandom } from './random'
import { byId, makeBank, reduceThroughCountdown } from './testing'
import {
  ALONE_GRACE_MS,
  ANSWER_GRACE_MS,
  MAX_PLAYERS,
  NEXT_COUNTDOWN_MS,
  REPORT_HOLD_MS,
} from './types'
import type { Choice, EngineContext, GameState, Settings } from './types'

const bank = makeBank(['PL', 'NL'], 12)
const settings: Settings = { cultures: ['PL', 'NL'], rounds: 10, seconds: 20 }

/** Host-side harness with a controllable clock. */
function harness(opts: { guests?: string[]; start?: boolean; countdown?: boolean } = {}) {
  const ctx: EngineContext = { now: 1_000_000, statements: byId(bank), random: seededRandom(42) }
  let state: GameState = createGame({ roomCode: 'BCDF', hostId: 'host', hostName: '', settings })
  const run = (action: Action) =>
    (state = (opts.countdown ? reduce : reduceThroughCountdown)(state, action, ctx))
  for (const id of opts.guests ?? ['ann', 'bob']) run({ type: 'join', playerId: id, name: id })
  if (opts.start ?? true) run({ type: 'start', gameId: 'g1' })
  return {
    ctx,
    run,
    get s() {
      return state
    },
    get round() {
      return currentRound(state)!
    },
    advance(ms: number) {
      ctx.now += ms
      return run({ type: 'tick' })
    },
    answer(playerId: string, choice: Choice) {
      return run({ type: 'answer', playerId, roundId: currentRound(state)!.id, choice })
    },
    answerAll(choice: 'right' | 'wrong' | 'unknown', ids = ['host', 'ann', 'bob']) {
      const round = currentRound(state)!
      const wrong = round.answer === 'PL' ? 'NL' : 'PL'
      const value = choice === 'right' ? round.answer : choice === 'wrong' ? wrong : 'unknown'
      for (const id of ids) run({ type: 'answer', playerId: id, roundId: round.id, choice: value })
    },
  }
}

describe('lobby', () => {
  it('creates a room with the host as a player named "Host" by default', () => {
    const h = harness({ guests: [], start: false })
    expect(h.s.phase).toBe('lobby')
    expect(h.s.players).toEqual([
      expect.objectContaining({ id: 'host', name: 'Host', isHost: true, connected: true }),
    ])
  })

  it('suffixes duplicate names and trims long ones', () => {
    const h = harness({ guests: [], start: false })
    h.run({ type: 'join', playerId: 'a', name: '  anna ' })
    h.run({ type: 'join', playerId: 'b', name: 'Anna' })
    h.run({ type: 'join', playerId: 'c', name: 'ANNA' })
    h.run({ type: 'join', playerId: 'd', name: 'x'.repeat(40) })
    h.run({ type: 'join', playerId: 'e', name: '   ' })
    expect(h.s.players.map((p) => p.name)).toEqual([
      'Host',
      'anna',
      'Anna 2',
      'ANNA 3',
      'x'.repeat(20),
      'Player',
    ])
  })

  it('strips invisible, direction-flipping and stacked characters from names', () => {
    const h = harness({ guests: [], start: false })
    h.run({ type: 'join', playerId: 'a', name: 'Ann‮evil​\n' })
    h.run({ type: 'join', playerId: 'b', name: 'Z̀́̂̃̄o' })
    h.run({ type: 'join', playerId: 'c', name: '👩‍👧 Mia' })
    h.run({ type: 'join', playerId: 'd', name: 'x'.repeat(19) + '😀' })
    expect(h.s.players.slice(1).map((p) => p.name)).toEqual([
      'Annevil',
      'Z̀́o',
      '👩‍👧 Mia',
      'x'.repeat(19),
    ])
  })

  it('rejoins a known player without creating a duplicate', () => {
    const h = harness({ start: false })
    h.run({ type: 'presence', onlineIds: ['bob'] })
    expect(h.s.players.find((p) => p.id === 'ann')!.connected).toBe(false)
    h.run({ type: 'join', playerId: 'ann', name: 'new name' })
    expect(h.s.players).toHaveLength(3)
    expect(h.s.players.find((p) => p.id === 'ann')).toMatchObject({ name: 'ann', connected: true })
  })

  it(`rejects players beyond ${MAX_PLAYERS} and kicked players`, () => {
    const h = harness({
      guests: Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => `p${i}`),
      start: false,
    })
    expect(joinRejection(h.s, 'late')).toBe('full')
    expect(joinRejection(h.s, 'p0')).toBeNull()
    h.run({ type: 'kick', playerId: 'p0' })
    expect(joinRejection(h.s, 'p0')).toBe('kicked')
    const before = h.s
    h.run({ type: 'join', playerId: 'p0', name: 'again' })
    expect(h.s).toBe(before)
  })

  it('a player who leaves is removed but may rejoin', () => {
    const h = harness({ start: false })
    h.run({ type: 'leave', playerId: 'ann' })
    expect(h.s.players.map((p) => p.id)).toEqual(['host', 'bob'])
    expect(joinRejection(h.s, 'ann')).toBeNull()
    h.run({ type: 'join', playerId: 'ann', name: 'ann' })
    expect(h.s.players.map((p) => p.id)).toEqual(['host', 'bob', 'ann'])
  })

  it('mid-game, a player who leaves keeps their score and can rejoin', () => {
    const h = harness()
    h.answerAll('right')
    const score = h.s.players.find((p) => p.id === 'ann')!.score
    h.run({ type: 'leave', playerId: 'ann' })
    expect(h.s.players.find((p) => p.id === 'ann')).toMatchObject({
      score,
      left: true,
      connected: false,
    })
    // Still listed as online until the channel drops: stays out of the round.
    h.run({ type: 'presence', onlineIds: ['ann', 'bob'] })
    expect(h.s.players.find((p) => p.id === 'ann')!.connected).toBe(false)
    h.run({ type: 'join', playerId: 'ann', name: 'ann' })
    const ann = h.s.players.find((p) => p.id === 'ann')!
    expect(ann).toMatchObject({ score, connected: true })
    expect(ann.left).toBeUndefined()
  })

  it('the host cannot leave', () => {
    const h = harness({ start: false })
    const before = h.s
    expect(h.run({ type: 'leave', playerId: 'host' })).toBe(before)
  })

  it('cannot kick the host', () => {
    const h = harness({ start: false })
    const before = h.s
    expect(h.run({ type: 'kick', playerId: 'host' })).toBe(before)
  })

  it('needs at least 2 connected players to start', () => {
    const h = harness({ guests: [], start: false })
    h.run({ type: 'start', gameId: 'g1' })
    expect(h.s.phase).toBe('lobby')
    h.run({ type: 'join', playerId: 'ann', name: 'Ann' })
    h.run({ type: 'start', gameId: 'g1' })
    expect(h.s.phase).toBe('question')
  })

  it('accepts only valid settings, and only in the lobby', () => {
    const h = harness({ start: false })
    h.run({ type: 'updateSettings', settings: { ...settings, cultures: ['PL'] } })
    h.run({ type: 'updateSettings', settings: { ...settings, rounds: 12 as 10 } })
    h.run({ type: 'updateSettings', settings: { ...settings, cultures: ['PL', 'PL'] } })
    expect(h.s.settings).toEqual(settings)
    h.run({ type: 'updateSettings', settings: { ...settings, seconds: 30 } })
    expect(h.s.settings.seconds).toBe(30)
    h.run({ type: 'start', gameId: 'g1' })
    h.run({ type: 'updateSettings', settings: { ...settings, seconds: 15 } })
    expect(h.s.settings.seconds).toBe(30)
  })
})

describe('question and reveal', () => {
  it('starts round 1 with an absolute deadline', () => {
    const h = harness()
    expect(h.s).toMatchObject({
      phase: 'question',
      totalRounds: 10,
      gameId: 'g1',
      playersAtStart: 3,
    })
    expect(h.round.index).toBe(0)
    expect(h.s.endsAt).toBe(h.ctx.now + 20_000)
    expect(h.s.queue).toHaveLength(23)
  })

  it('reveals early when every connected player has answered, and scores with the bonus', () => {
    const h = harness()
    h.ctx.now += 1000
    h.answer('bob', h.round.answer)
    h.ctx.now += 1000
    h.answer('ann', h.round.answer)
    expect(h.s.phase).toBe('question')
    h.answerAll('wrong', ['host'])
    expect(h.s.phase).toBe('reveal')
    expect(h.round.result).toMatchObject({ bonusId: 'bob', correctIds: ['bob', 'ann'] })
    expect(h.s.players.map((p) => p.score)).toEqual([0, 1, 2])
  })

  it('lets players change answers; the bonus uses the time of the last change', () => {
    const h = harness()
    const right = h.round.answer
    const wrong = right === 'PL' ? 'NL' : 'PL'
    h.answer('ann', right)
    h.ctx.now += 100
    h.answer('bob', right)
    h.ctx.now += 100
    h.answer('ann', wrong)
    h.ctx.now += 100
    h.answer('ann', right)
    h.answerAll('wrong', ['host'])
    expect(h.round.result!.bonusId).toBe('bob')
  })

  it('ignores re-sending the same answer (keeps the original time)', () => {
    const h = harness()
    h.answer('ann', h.round.answer)
    const at = h.round.answers.ann.at
    h.ctx.now += 500
    h.answer('ann', h.round.answer)
    expect(h.round.answers.ann.at).toBe(at)
  })

  it('rejects answers for another round, invalid cultures, or after the grace period', () => {
    const h = harness()
    h.run({ type: 'answer', playerId: 'ann', roundId: 'old', choice: h.round.answer })
    h.answer('ann', 'BR')
    h.ctx.now += 20_000 + ANSWER_GRACE_MS + 1
    h.answer('bob', h.round.answer)
    expect(h.round.answers).toEqual({})
  })

  it('accepts an answer that arrives within the grace period after the deadline', () => {
    const h = harness()
    h.ctx.now += 20_000 + ANSWER_GRACE_MS - 1
    h.answer('ann', h.round.answer)
    expect(h.round.answers.ann).toBeDefined()
  })

  it('reveals when the timer runs out (after the grace period)', () => {
    const h = harness()
    h.answer('ann', h.round.answer)
    h.advance(20_000)
    expect(h.s.phase).toBe('question')
    h.advance(ANSWER_GRACE_MS)
    expect(h.s.phase).toBe('reveal')
    expect(h.round.result!.split).toEqual({ [h.round.answer]: 1 })
  })

  it('does not wait for disconnected players', () => {
    const h = harness()
    h.run({ type: 'presence', onlineIds: ['ann'] }) // bob drops
    h.answerAll('right', ['host', 'ann'])
    expect(h.s.phase).toBe('reveal')
  })

  it('reveals when the last missing player disconnects', () => {
    const h = harness()
    h.answerAll('right', ['host', 'ann'])
    expect(h.s.phase).toBe('question')
    h.run({ type: 'presence', onlineIds: ['ann'] })
    expect(h.s.phase).toBe('reveal')
  })

  it('lets late joiners play from the next round only', () => {
    const h = harness()
    h.run({ type: 'join', playerId: 'cat', name: 'Cat' })
    expect(h.s.players.at(-1)!.playsFrom).toBe(1)
    h.answer('cat', h.round.answer)
    expect(h.round.answers.cat).toBeUndefined()
    h.answerAll('right') // cat isn't waited for
    expect(h.s.phase).toBe('reveal')
    h.run({ type: 'next' })
    h.answer('cat', h.round.answer)
    expect(h.round.answers.cat).toBeDefined()
  })

  it('goes to the final screen after the last round', () => {
    const h = harness()
    for (let i = 0; i < 10; i++) {
      expect(h.round.index).toBe(i)
      h.answerAll('right')
      h.run({ type: 'next' })
    }
    expect(h.s.phase).toBe('final')
    expect(h.s.rounds).toHaveLength(10)
    expect(h.s.players[0].score).toBe(20) // host answers first every round: 1 + bonus
  })
})

describe('replacement', () => {
  it('reveals the statement with 0 points when everyone picks "I don\'t know"', () => {
    const h = harness()
    const first = h.round
    h.answerAll('unknown')
    expect(h.s.phase).toBe('reveal')
    expect(h.round.index).toBe(0)
    expect(h.round.statementId).toBe(first.statementId)
    expect(h.round.result).toMatchObject({ correctIds: [], bonusId: null })
    expect(h.s.players.map((p) => p.score)).toEqual([0, 0, 0])
    expect(h.s.shownIds).toEqual([first.statementId])
    expect(h.s.replaced ?? []).toEqual([])
  })

  it('reveals normally when only some pick "I don\'t know"', () => {
    const h = harness()
    h.answerAll('unknown', ['host', 'ann'])
    h.answerAll('wrong', ['bob'])
    expect(h.s.phase).toBe('reveal')
  })

  it('host Skip replaces with the same correct culture and restarts the timer', () => {
    const h = harness()
    const answer = h.round.answer
    h.ctx.now += 5000
    h.run({ type: 'skip' })
    expect(h.round.answer).toBe(answer)
    expect(h.s.endsAt).toBe(h.ctx.now + 20_000)
  })

  it('keeps the planned rounds intact when replacing', () => {
    const h = harness()
    const planned = h.s.queue.slice(0, 9)
    h.run({ type: 'skip' })
    expect(h.s.queue.slice(0, 9)).toEqual(planned)
  })

  it('scores the round as is when the reserve is empty', () => {
    const h = harness()
    for (let i = 0; i < 14; i++) h.run({ type: 'skip' })
    expect(h.s.queue).toHaveLength(9)
    h.run({ type: 'skip' })
    expect(h.s.phase).toBe('reveal')
  })
})

describe('next countdown', () => {
  function atReveal() {
    const h = harness({ countdown: true })
    h.answerAll('right')
    expect(h.s.phase).toBe('reveal')
    return h
  }

  it('waits NEXT_COUNTDOWN_MS after Next, then starts the next question', () => {
    const h = atReveal()
    h.run({ type: 'next' })
    expect(h.s).toMatchObject({ phase: 'reveal', nextAt: h.ctx.now + NEXT_COUNTDOWN_MS })
    const counting = h.s
    expect(h.run({ type: 'next' })).toBe(counting)
    h.advance(NEXT_COUNTDOWN_MS - 1)
    expect(h.s.phase).toBe('reveal')
    h.advance(1)
    expect(h.s).toMatchObject({ phase: 'question', nextAt: null })
    expect(h.s.rounds).toHaveLength(2)
  })

  it('is cancelled by a pause, by Back and by a report; Next starts it again', () => {
    const h = atReveal()
    const statementId = h.round.statementId
    h.run({ type: 'next' })
    h.run({ type: 'pause' })
    expect(h.s.nextAt).toBeNull()
    h.run({ type: 'resume' })
    h.advance(NEXT_COUNTDOWN_MS)
    expect(h.s.phase).toBe('reveal')

    h.run({ type: 'next' })
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    expect(h.s.nextAt).toBeNull()
    h.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'none' })
    h.advance(NEXT_COUNTDOWN_MS)
    expect(h.s.phase).toBe('reveal')

    h.run({ type: 'next' })
    h.advance(NEXT_COUNTDOWN_MS)
    expect(h.s.phase).toBe('question')
  })

  it('also leads to the final scores after the last round', () => {
    const h = harness({ countdown: true })
    for (let i = 0; i < settings.rounds; i++) {
      h.answerAll('right')
      h.run({ type: 'next' })
      h.advance(NEXT_COUNTDOWN_MS)
    }
    expect(h.s).toMatchObject({ phase: 'final', nextAt: null })
  })
})

describe('host controls', () => {
  it('pause freezes the remaining time; resume sets a new deadline', () => {
    const h = harness()
    h.ctx.now += 5000
    h.run({ type: 'pause' })
    expect(h.s).toMatchObject({ paused: true, remainingMs: 15_000, endsAt: null })
    h.advance(60_000)
    expect(h.s.phase).toBe('question')
    h.answer('ann', h.round.answer)
    expect(h.round.answers.ann).toBeUndefined()
    h.run({ type: 'resume' })
    expect(h.s).toMatchObject({ paused: false, endsAt: h.ctx.now + 15_000 })
  })

  it('back from a reveal views earlier reveals; next continues with a new question', () => {
    const h = harness()
    h.answerAll('right')
    h.run({ type: 'next' })
    h.answerAll('right')
    h.run({ type: 'next' })
    h.answerAll('right')
    expect(h.round.index).toBe(2)
    h.run({ type: 'back' })
    expect(h.s.viewing).toBe(1)
    h.run({ type: 'back' })
    expect(h.s.viewing).toBe(0)
    const before = h.s
    expect(h.run({ type: 'back' })).toBe(before) // nothing before round 1
    h.run({ type: 'next' })
    expect(h.s).toMatchObject({ phase: 'question', viewing: null })
    expect(h.round.index).toBe(3)
  })

  it('back during a question pauses it; next resumes it', () => {
    const h = harness()
    h.answerAll('right')
    h.run({ type: 'next' })
    h.ctx.now += 4000
    h.run({ type: 'back' })
    expect(h.s).toMatchObject({ viewing: 0, paused: true, remainingMs: 16_000 })
    h.ctx.now += 30_000
    h.run({ type: 'next' })
    expect(h.s).toMatchObject({ viewing: null, paused: false, endsAt: h.ctx.now + 16_000 })
    expect(h.round.index).toBe(1)
  })

  it('back during a question that the host had paused keeps it paused', () => {
    const h = harness()
    h.answerAll('right')
    h.run({ type: 'next' })
    h.run({ type: 'pause' })
    h.run({ type: 'back' })
    h.run({ type: 'next' })
    expect(h.s).toMatchObject({ viewing: null, paused: true })
  })

  it('end during a question drops the unfinished round', () => {
    const h = harness()
    h.answerAll('right')
    h.run({ type: 'next' })
    h.run({ type: 'end' })
    expect(h.s.phase).toBe('final')
    expect(h.s.rounds).toHaveLength(1)
  })

  it('kicking the last missing player reveals the round', () => {
    const h = harness()
    h.answerAll('right', ['host', 'ann'])
    h.run({ type: 'kick', playerId: 'bob' })
    expect(h.s.phase).toBe('reveal')
    expect(h.s.players.map((p) => p.id)).toEqual(['host', 'ann'])
  })

  it('the last missing player leaving reveals the round', () => {
    const h = harness()
    h.answerAll('right', ['host', 'ann'])
    h.run({ type: 'leave', playerId: 'bob' })
    expect(h.s.phase).toBe('reveal')
  })

  it('play again returns to the lobby with scores reset and avoids repeats', () => {
    const h = harness()
    h.answerAll('right')
    const firstGame = [...h.s.shownIds]
    expect(h.s.replay).toBeUndefined()
    h.run({ type: 'end' })
    h.run({ type: 'playAgain', gameId: 'g2' })
    expect(h.s).toMatchObject({ phase: 'lobby', gameId: 'g2', rounds: [], replay: true })
    expect(h.s.players.every((p) => p.score === 0)).toBe(true)
    h.run({ type: 'start', gameId: 'g2' })
    expect(firstGame).not.toContain(h.round.statementId)
  })

  it('remembers a room created from the guest CTA (metrics), and nothing otherwise', () => {
    const base = { roomCode: 'BCDF', hostId: 'host', settings }
    expect(createGame({ ...base, source: 'guest_cta' }).source).toBe('guest_cta')
    expect(createGame(base)).not.toHaveProperty('source')
  })
})

describe('report hold', () => {
  /** A harness on the reveal of round 1. */
  function onReveal() {
    const h = harness()
    h.answerAll('right')
    return { h, statementId: h.round.statementId }
  }

  it('holds Next and Back until the reporter picks a reason; the host cannot resume it', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    expect(openReports(h.s, h.ctx.now)).toHaveLength(1)
    const held = h.s
    h.run({ type: 'next' })
    h.run({ type: 'back' })
    h.run({ type: 'resume' })
    expect(h.s).toBe(held)
    h.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'outdated' })
    expect(h.s.reports).toEqual([expect.objectContaining({ playerId: 'ann', reason: 'outdated' })])
    h.run({ type: 'next' })
    expect(h.s.phase).toBe('question')
  })

  it('expires on the host clock with no reason, so a reporter who drops cannot stall the game', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'reportOpen', playerId: 'bob', statementId })
    h.advance(REPORT_HOLD_MS - 1)
    expect(h.s.reports![0].reason).toBeNull()
    h.advance(1)
    expect(h.s.reports![0].reason).toBe('none')
    // A late answer from the reporter doesn't change the recorded report.
    h.run({ type: 'reportDone', playerId: 'bob', statementId, reason: 'offensive' })
    expect(h.s.reports![0].reason).toBe('none')
    h.run({ type: 'next' })
    expect(h.s.phase).toBe('question')
  })

  it('with several reporters, holds until the last one is done', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    h.ctx.now += 4000
    h.run({ type: 'reportOpen', playerId: 'host', statementId })
    h.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'incorrect' })
    h.advance(REPORT_HOLD_MS - 1)
    h.run({ type: 'next' })
    expect(h.s.phase).toBe('reveal')
    h.advance(1)
    h.run({ type: 'next' })
    expect(h.s.phase).toBe('question')
    expect(h.s.reports!.map((r) => r.reason)).toEqual(['incorrect', 'none'])
  })

  it('counts each player once per statement, and only for the reveal on screen', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'reportOpen', playerId: 'ann', statementId: 'nope' })
    expect(h.s.reports).toEqual([])
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    h.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'none' })
    const done = h.s
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    expect(h.s).toBe(done)
  })

  it('cannot open during a question, but still counts a reason whose open got lost', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'next' })
    h.run({ type: 'reportOpen', playerId: 'ann', statementId: h.round.statementId })
    expect(h.s.reports).toEqual([])
    h.run({ type: 'reportDone', playerId: 'ann', statementId, reason: 'not_unique' })
    expect(h.s.reports).toEqual([expect.objectContaining({ reason: 'not_unique' })])
    expect(openReports(h.s, h.ctx.now)).toEqual([])
  })

  it('rejects unknown reasons and resets with a new game', () => {
    const { h, statementId } = onReveal()
    h.run({ type: 'reportOpen', playerId: 'ann', statementId })
    h.run({
      type: 'reportDone',
      playerId: 'ann',
      statementId,
      reason: 'boring' as 'none',
    })
    expect(h.s.reports![0].reason).toBeNull()
    h.run({ type: 'end' })
    h.run({ type: 'playAgain', gameId: 'g2' })
    h.run({ type: 'start', gameId: 'g2' })
    expect(h.s.reports).toEqual([])
  })
})

describe('host left alone', () => {
  it('holds at once when the last other players leave or are removed', () => {
    const h = harness()
    h.run({ type: 'leave', playerId: 'ann' })
    expect(h.s.waitingForPlayers).toBeFalsy()
    h.run({ type: 'kick', playerId: 'bob' })
    expect(h.s.waitingForPlayers).toBe(true)
    expect(h.s.paused).toBe(true)
    expect(h.s.endsAt).toBeNull()
    expect(h.s.remainingMs).toBe(20_000)
  })

  it('gives a dropped connection the grace period before holding', () => {
    const h = harness()
    h.run({ type: 'presence', onlineIds: [] })
    expect(h.s.waitingForPlayers).toBeFalsy()
    h.advance(ALONE_GRACE_MS - 1000)
    expect(h.s.waitingForPlayers).toBeFalsy()
    h.advance(1000)
    expect(h.s.waitingForPlayers).toBe(true)
  })

  it('does not hold when someone reconnects within the grace period', () => {
    const h = harness()
    h.run({ type: 'presence', onlineIds: [] })
    h.advance(5000)
    h.run({ type: 'presence', onlineIds: ['ann'] })
    expect(h.s.aloneSince).toBeNull()
    h.advance(ALONE_GRACE_MS)
    expect(h.s.waitingForPlayers).toBeFalsy()
  })

  it('blocks play while waiting; Continue works only once someone is back', () => {
    const h = harness()
    h.run({ type: 'leave', playerId: 'ann' })
    h.run({ type: 'leave', playerId: 'bob' })
    const held = h.s
    for (const type of ['resume', 'next', 'back', 'skip'] as const) h.run({ type })
    h.answer('host', h.round.answer)
    h.advance(60_000)
    expect(h.s).toBe(held)

    h.run({ type: 'join', playerId: 'ann', name: 'ann' })
    expect(h.s.waitingForPlayers).toBe(true) // the host decides when to go on
    h.run({ type: 'resume' })
    expect(h.s.waitingForPlayers).toBe(false)
    expect(h.s.paused).toBe(false)
    expect(h.s.endsAt).toBe(h.ctx.now + 20_000)
  })

  it('holds on a reveal too, and End still finishes the game', () => {
    const h = harness()
    h.answerAll('right')
    expect(h.s.phase).toBe('reveal')
    h.run({ type: 'kick', playerId: 'ann' })
    h.run({ type: 'kick', playerId: 'bob' })
    expect(h.s.waitingForPlayers).toBe(true)
    h.run({ type: 'end' })
    expect(h.s.phase).toBe('final')
    expect(h.s.waitingForPlayers).toBe(false)
  })

  it('never holds in the lobby', () => {
    const h = harness({ start: false })
    h.run({ type: 'leave', playerId: 'ann' })
    h.run({ type: 'leave', playerId: 'bob' })
    h.advance(ALONE_GRACE_MS * 2)
    expect(h.s.waitingForPlayers).toBeFalsy()
  })
})

describe('random countries mode', () => {
  const pool = makeBank([...CULTURE_CODES], 4)
  function randomGame() {
    const ctx: EngineContext = { now: 1_000_000, statements: byId(pool), random: seededRandom(9) }
    let state = createGame({
      roomCode: 'BCDF',
      hostId: 'host',
      settings: { mode: 'random', cultures: [], rounds: 10, seconds: 20 },
    })
    const run = (action: Action) => (state = reduceThroughCountdown(state, action, ctx))
    run({ type: 'join', playerId: 'ann', name: 'Ann' })
    run({ type: 'start', gameId: 'g1' })
    return {
      run,
      get s() {
        return state
      },
    }
  }

  it('starts without picked countries and gives each round 4 options with the answer', () => {
    const g = randomGame()
    expect(g.s.phase).toBe('question')
    const round = currentRound(g.s)!
    expect(round.options).toHaveLength(4)
    expect(round.options).toContain(round.answer)
  })

  it('accepts only this round’s options', () => {
    const g = randomGame()
    const round = currentRound(g.s)!
    const outside = CULTURE_CODES.find((c) => !round.options!.includes(c))!
    g.run({ type: 'answer', playerId: 'ann', roundId: round.id, choice: outside })
    expect(currentRound(g.s)!.answers.ann).toBeUndefined()
    g.run({ type: 'answer', playerId: 'ann', roundId: round.id, choice: round.options![0] })
    expect(currentRound(g.s)!.answers.ann).toBeDefined()
  })

  it('gives a skipped round’s replacement its own options', () => {
    const g = randomGame()
    const before = currentRound(g.s)!
    g.run({ type: 'skip' })
    const after = currentRound(g.s)!
    expect(after.statementId).not.toBe(before.statementId)
    expect(after.options).toContain(after.answer)
  })

  it('keeps the picked countries while random, even fewer than 2', () => {
    const h = harness({ guests: [], start: false })
    h.run({ type: 'updateSettings', settings: { ...settings, mode: 'random', cultures: ['PL'] } })
    expect(h.s.settings).toMatchObject({ mode: 'random', cultures: ['PL'] })
    h.run({ type: 'updateSettings', settings: { ...settings, mode: 'pick', cultures: ['PL'] } })
    expect(h.s.settings.mode).toBe('random')
  })
})
