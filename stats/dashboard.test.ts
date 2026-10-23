import { describe, expect, it } from 'vitest'
import { dashboardNumbers, renderDashboardBody, type DashboardRow } from './dashboard'

const row = (
  type: string,
  data: object,
  game_id = '',
  created_at = '2026-10-21T10:00:00Z',
): DashboardRow => ({
  type,
  game_id,
  data: JSON.stringify(data),
  created_at,
})

describe('dashboardNumbers', () => {
  const rows = [
    row(
      'game_started',
      { players: 6, replay: false, source: 'lander' },
      'g1',
      '2026-10-13T10:00:00Z',
    ),
    row('game_finished', { playersAtEnd: 5, endedEarly: false }, 'g1'),
    row('game_started', { players: 4, replay: true, source: 'lander' }, 'g2'),
    row('game_finished', { playersAtEnd: 4, endedEarly: true }, 'g2'),
    row('game_started', { players: 5, replay: false, source: 'guest_cta' }, 'g3'),
    row('play_again_vote', { vote: 'yes' }, 'g1'),
    row('play_again_vote', { vote: 'no' }, 'g1'),
    row('host_cta_click', {}, 'g1'),
    row('lander_click', { target: 'host_hero' }),
    row('lander_click', { target: 'host_header' }),
    row('lander_click', { target: 'join_code' }),
    row('join_step', { step: 'opened' }),
    row('join_step', { step: 'named' }),
    row('join_step', { step: 'final' }, 'g1'),
  ]
  const d = dashboardNumbers(rows)

  it('computes the success signals', () => {
    expect(d).toMatchObject({
      games: 3,
      games5: 2,
      completed: 1,
      games80: 1,
      votes: 2,
      yes: 1,
      finished: 2,
      replays: 1,
      ctaTaps: 1,
      roomsFromCta: 1,
      lander: { host: 2, joinCode: 1, roomsFromLander: 1 },
      join: { opened: 1, named: 1, joined: 0, final: 1 },
    })
    expect(d.medianFinish).toBe(0) // 83%, 0% (ended early), 0% (abandoned)
  })

  it('groups games by week, with empty weeks in between', () => {
    expect(d.weeks).toEqual([
      { week: '2026-10-12', games: 1 },
      { week: '2026-10-19', games: 2 },
    ])
  })

  it('renders tiles and funnels', () => {
    const html = renderDashboardBody(d, [])
    expect(html).toContain('Sessions with 5+ players')
    expect(html).toContain('games started from the lander')
    expect(html).toContain('50% of previous')
  })
})
