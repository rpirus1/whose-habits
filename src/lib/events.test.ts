import { describe, expect, it } from 'vitest'
import { isPreviewHost, parseEvent, statementVersion } from './events'

const gameId = '0b9c3a52-7d1e-4f6a-9c2b-1e2d3f4a5b6c'

describe('parseEvent', () => {
  it('accepts each event type and keeps only known fields', () => {
    expect(
      parseEvent({ type: 'play_again_vote', gameId, vote: 'yes', role: 'guest', name: 'Anna' }),
    ).toEqual({ type: 'play_again_vote', gameId, vote: 'yes', role: 'guest' })
    expect(
      parseEvent({
        type: 'game_started',
        gameId,
        players: 5,
        cultures: ['PL', 'NL'],
        rounds: 10,
        seconds: 20,
      }),
    ).toMatchObject({ players: 5 })
    expect(
      parseEvent({
        type: 'game_finished',
        gameId,
        roundsPlayed: 10,
        totalRounds: 10,
        playersAtStart: 5,
        playersAtEnd: 4,
        endedEarly: false,
      }),
    ).toMatchObject({ playersAtEnd: 4 })
    expect(parseEvent({ type: 'host_cta_click', gameId })).toEqual({
      type: 'host_cta_click',
      gameId,
    })
    expect(parseEvent({ type: 'share_click', gameId, role: 'host' })).toBeTruthy()
    expect(
      parseEvent({ type: 'report', gameId, statementId: 'nl-007', reason: 'not_unique' }),
    ).toEqual({ type: 'report', gameId, statementId: 'nl-007', reason: 'not_unique' })
  })

  it('reads a report without a reason (older builds) as no reason given', () => {
    expect(parseEvent({ type: 'report', gameId, statementId: 'nl-007' })).toEqual({
      type: 'report',
      gameId,
      statementId: 'nl-007',
      reason: 'none',
    })
  })

  it('keeps the replay flag and source, with defaults for older clients', () => {
    const started = {
      type: 'game_started',
      gameId,
      players: 3,
      cultures: ['PL'],
      rounds: 10,
      seconds: 20,
    }
    expect(parseEvent({ ...started, replay: true, source: 'guest_cta' })).toMatchObject({
      replay: true,
      source: 'guest_cta',
    })
    expect(parseEvent(started)).toMatchObject({ replay: false, source: 'direct', mode: 'pick' })
    expect(parseEvent({ ...started, mode: 'random', cultures: [] })).toMatchObject({
      mode: 'random',
      cultures: [],
    })
    expect(parseEvent({ ...started, mode: 'mixed' })).toBeNull()
    expect(parseEvent({ ...started, replay: 'yes' })).toBeNull()
    expect(parseEvent({ ...started, source: 'ads' })).toBeNull()
  })

  it('keeps test: true and drops any other test value', () => {
    const cta = { type: 'host_cta_click', gameId }
    expect(parseEvent({ ...cta, test: true })).toEqual({ ...cta, test: true })
    expect(parseEvent({ ...cta, test: 1 })).toEqual(cta)
    expect(parseEvent({ ...cta, test: false })).toEqual(cta)
  })

  it('rejects junk, unknown types and out-of-range values', () => {
    for (const bad of [
      null,
      'report',
      { type: 'report', gameId: 'not-a-uuid', statementId: 'nl-007' },
      { type: 'report', gameId, statementId: '<script>' },
      { type: 'report', gameId, statementId: 'nl-007', reason: 'boring' },
      { type: 'unknown', gameId },
      { type: 'play_again_vote', gameId, vote: 'definitely', role: 'guest' },
      { type: 'game_started', gameId, players: 500, cultures: [], rounds: 10, seconds: 20 },
      { type: 'game_started', gameId, players: 5, cultures: ['xx'], rounds: 10, seconds: 20 },
      {
        type: 'game_finished',
        gameId,
        roundsPlayed: 1.5,
        totalRounds: 10,
        playersAtStart: 2,
        playersAtEnd: 2,
        endedEarly: true,
      },
    ]) {
      expect(parseEvent(bad)).toBeNull()
    }
  })
})

describe('isPreviewHost', () => {
  it('treats the workers.dev preview URL as test traffic, and the own domain as real', () => {
    expect(isPreviewHost('culture-clash.ruslan-pirus.workers.dev')).toBe(true)
    expect(isPreviewHost('www.whosehabits.com')).toBe(false)
    expect(isPreviewHost('whosehabits.com')).toBe(false)
    expect(isPreviewHost('notworkers.dev')).toBe(false)
  })
})

describe('statement, lander and join events', () => {
  const v = statementVersion({ text: 'Hosts hand out slippers.', fits: ['PL', 'UA'] })

  it('versions statements by wording and fits, not by fits order', () => {
    expect(v).toMatch(/^[0-9a-f]{8}$/)
    expect(statementVersion({ text: 'Hosts hand out slippers.', fits: ['UA', 'PL'] })).toBe(v)
    expect(statementVersion({ text: 'Hosts hand out slippers!', fits: ['PL', 'UA'] })).not.toBe(v)
    expect(statementVersion({ text: 'Hosts hand out slippers.', fits: ['PL'] })).not.toBe(v)
  })

  it('accepts round results and drops empty split entries', () => {
    expect(
      parseEvent({
        type: 'round_result',
        gameId,
        statementId: 'pl-001',
        v,
        answer: 'PL',
        split: { PL: 2, NL: 1, unknown: 0 },
        names: ['Anna'],
      }),
    ).toEqual({
      type: 'round_result',
      gameId,
      statementId: 'pl-001',
      v,
      answer: 'PL',
      split: { PL: 2, NL: 1 },
    })
  })

  it('accepts replaced statements, lander clicks and join steps', () => {
    expect(
      parseEvent({ type: 'statement_replaced', gameId, statementId: 'pl-001', v, why: 'skip' }),
    ).toBeTruthy()
    expect(parseEvent({ type: 'lander_click', target: 'host_hero', gameId })).toEqual({
      type: 'lander_click',
      target: 'host_hero',
    })
    expect(parseEvent({ type: 'join_step', step: 'named', roomCode: 'secret' })).toEqual({
      type: 'join_step',
      step: 'named',
    })
    expect(parseEvent({ type: 'join_step', step: 'missing', gameId })).toEqual({
      type: 'join_step',
      step: 'missing',
    })
    expect(parseEvent({ type: 'join_step', step: 'final', gameId })).toEqual({
      type: 'join_step',
      step: 'final',
      gameId,
    })
  })

  it('keeps the optional report fields', () => {
    expect(
      parseEvent({
        type: 'report',
        gameId,
        statementId: 'pl-001',
        reason: 'offensive',
        v,
        heldMs: 4200,
        nth: 2,
      }),
    ).toEqual({
      type: 'report',
      gameId,
      statementId: 'pl-001',
      reason: 'offensive',
      v,
      heldMs: 4200,
      nth: 2,
    })
  })

  it('rejects bad values', () => {
    for (const bad of [
      { type: 'round_result', gameId, statementId: 'pl-001', v, answer: 'PL', split: { PL: 99 } },
      { type: 'round_result', gameId, statementId: 'pl-001', v, answer: 'PL', split: { Anna: 1 } },
      { type: 'round_result', gameId, statementId: 'pl-001', v: 'xyz', answer: 'PL', split: {} },
      { type: 'statement_replaced', gameId, statementId: 'pl-001', v, why: 'boring' },
      { type: 'lander_click', target: 'somewhere' },
      { type: 'join_step', step: 'final' },
      { type: 'join_step', step: 'left' },
      { type: 'report', gameId, statementId: 'pl-001', heldMs: 999_999 },
      { type: 'report', gameId, statementId: 'pl-001', nth: 0 },
    ]) {
      expect(parseEvent(bad)).toBeNull()
    }
  })
})
