import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { filterParams, filterSql, parseFilters, renderStats, splitQueries } from './page'

describe('splitQueries', () => {
  it('finds every numbered query in metrics.sql, without the file header', () => {
    const sql = readFileSync(new URL('../scripts/metrics.sql', import.meta.url), 'utf8')
    const queries = splitQueries(sql)
    expect(queries.map((q) => q.title)).toEqual([
      'Games played (target: 3 sessions with 5+ players)',
      'How games ended (completed = reached the last round, abandoned = no final screen)',
      'Player finish rate (target: at least 80% of players finish all rounds)',
      'Would you play again? (stated: the vote on the final screen)',
      'Did they actually play again? (replays started from "Play again in this room")',
      'Guest to host (tapped "Host your own game", then started a game in their own room)',
      'Reported statements (review these before each content update)',
      'Games per day (UTC days, last 30 with games)',
    ])
    for (const q of queries) {
      expect(q.sql).toMatch(/SELECT/)
      expect(q.sql).toMatch(/test = 0/)
    }
  })
})

describe('renderStats', () => {
  it('escapes values and shows an empty state', () => {
    const html = renderStats(
      [
        { title: 'Reports', rows: [{ statement_id: '<b>x</b>', reports: 2 }] },
        { title: 'Nothing', rows: [] },
      ],
      new Date('2026-10-19T12:00:00Z'),
    )
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('No data yet.')
    expect(html).toContain('Updated 19/10/2026 14:00.') // Amsterdam time
  })
})

describe('filters', () => {
  const parse = (q: string) => parseFilters(new URLSearchParams(q))

  it('shows all events and all time by default, real players with ?data=real', () => {
    expect(parse('')).toEqual({ scope: 'all', from: null, to: null })
    expect(parse('data=real').scope).toBe('real')
  })

  it('keeps valid dates, drops junk, and swaps a reversed range', () => {
    expect(parse('from=2026-10-01&to=2026-10-23')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-23',
    })
    expect(parse('from=yesterday&to=2026-13-45')).toMatchObject({ from: null, to: null })
    expect(parse('from=2026-10-23&to=2026-10-01')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-23',
    })
  })

  it('binds test, from and an exclusive end of the last day', () => {
    expect(filterParams({ scope: 'real', from: '2026-10-01', to: '2026-10-31' })).toEqual([
      0,
      '2026-09-30T22:00:00.000Z',
      '2026-10-31T23:00:00.000Z',
    ])
    expect(filterParams({ scope: 'all', from: null, to: null })).toEqual([1, '', '9999'])
  })

  it('filters every read of events in metrics.sql', () => {
    const sql = readFileSync(new URL('../scripts/metrics.sql', import.meta.url), 'utf8')
    for (const q of splitQueries(sql)) {
      const filtered = filterSql(q.sql)
      expect(filtered).not.toMatch(/\btest = 0\b(?! OR)/)
      // One filter per FROM events, so no subquery escapes the date range.
      expect(filtered.match(/created_at >= \?2/g)?.length).toBe(q.sql.match(/FROM events/g)?.length)
    }
  })

  it('renders the presets with the current one marked, and describes the filters', () => {
    const now = new Date('2026-10-23T12:00:00Z')
    const html = renderStats([], now, { scope: 'real', from: '2026-10-17', to: '2026-10-23' })
    expect(html).toContain(
      'class="chip on" href="?data=real&amp;from=2026-10-17&amp;to=2026-10-23">7 days',
    )
    expect(html).toContain('Real players only · 17/10/2026 to 23/10/2026 (Amsterdam time)')
  })
})
