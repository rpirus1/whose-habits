import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderStats, splitQueries } from './page'

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
      'Games per day (last 30 days with games)',
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
    expect(html).toContain('2026-10-19 12:00 UTC')
  })
})
