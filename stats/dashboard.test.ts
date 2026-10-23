import { describe, expect, it } from 'vitest'
import { dashboardNumbers, renderDashboardBody, type DashboardRow } from './dashboard'

const row = (
  type: string,
  data: object,
  game_id = '',
  created_at = '2026-10-21T10:00:00Z',
): DashboardRow => ({ type, game_id, data: JSON.stringify(data), created_at })

const start = (id: string, players: number, extra: object = {}, at?: string) =>
  row('game_started', { players, replay: false, source: 'direct', ...extra }, id, at)
const finish = (id: string, playersAtEnd: number, endedEarly = false) =>
  row('game_finished', { playersAtEnd, endedEarly }, id)
const vote = (id: string, v: string) => row('play_again_vote', { vote: v, role: 'guest' }, id)

const now = new Date('2026-10-28T12:00:00Z') // Wednesday of the week 26.10–1.11
const all = { scope: 'all' as const, from: null, to: null }

describe('dashboardNumbers', () => {
  const rows = [
    start('g1', 6, { source: 'lander' }, '2026-10-13T10:00:00Z'),
    finish('g1', 5),
    vote('g1', 'yes'),
    vote('g1', 'yes'),
    vote('g1', 'maybe'),
    start('g2', 4, { replay: true }),
    finish('g2', 4, true),
    vote('g2', 'no'),
    start('g3', 5, { source: 'guest_cta' }),
    start('g4', 6),
    finish('g4', 6),
    row('host_cta_click', {}, 'g1'),
    row('lander_click', { target: 'host_hero' }),
    row('join_step', { step: 'opened' }),
    row('join_step', { step: 'final' }, 'g1'),
  ]
  const d = dashboardNumbers(rows, { now, filters: all })

  it('counts completed games, ended early and not finished separately', () => {
    expect(d).toMatchObject({
      started: 4,
      completed: 2,
      endedEarly: 1,
      notFinished: 1,
      completed5: 2,
      replays: 1,
      roomsFromCta: 1,
      lander: { host: 1, roomsFromLander: 1 },
    })
  })

  it('splits "play again" by how the game ended, against everyone on the final screen', () => {
    expect(d.playAgain.full).toEqual({ players: 11, yes: 2, maybe: 1, no: 0, none: 8 })
    expect(d.playAgain.early).toEqual({ players: 4, yes: 0, maybe: 0, no: 1, none: 3 })
  })

  it('lists group sizes 2 to 12 with completed games and "yes" share', () => {
    expect(d.sizes).toHaveLength(11)
    expect(d.sizes.find((s) => s.players === 6)).toEqual({
      players: 6,
      started: 2,
      completed: 2,
      yes: 2,
      atFinal: 11,
    })
    expect(d.sizes.find((s) => s.players === 5)).toMatchObject({ started: 1, completed: 0 })
  })

  it('shows calendar weeks up to the current one, even when it has no games yet', () => {
    expect(d.weeks).toEqual([
      { week: '2026-10-12', completed: 1, other: 0 },
      { week: '2026-10-19', completed: 1, other: 2 },
      { week: '2026-10-26', completed: 0, other: 0 },
    ])
  })

  it('follows the date filter for the weeks shown', () => {
    const filtered = dashboardNumbers(rows, {
      now,
      filters: { scope: 'all', from: '2026-10-20', to: '2026-10-22' },
    })
    expect(filtered.weeks.map((w) => w.week)).toEqual(['2026-10-19'])
  })

  it('renders the tiles, play-again bars, size chart and week labels', () => {
    const html = renderDashboardBody(d, [])
    expect(html).toContain('Completed games')
    expect(html).toContain('5+ players: 2 (target 3)')
    expect(html).toContain('All rounds played')
    expect(html).toContain('Ended early')
    expect(html).toContain('Yes <strong>18%</strong>')
    expect(html).toContain('26.10–1.11')
    expect(html).toContain('Completed games by number of players')
  })
})
