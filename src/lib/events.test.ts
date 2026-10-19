import { describe, expect, it } from 'vitest'
import { parseEvent } from './events'

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
    expect(parseEvent({ type: 'report', gameId, statementId: 'nl-007' })).toEqual({
      type: 'report',
      gameId,
      statementId: 'nl-007',
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
    expect(parseEvent(started)).toMatchObject({ replay: false, source: 'direct' })
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
