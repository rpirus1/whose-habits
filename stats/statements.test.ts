import { describe, expect, it } from 'vitest'
import {
  aggregateStatements,
  holdHealth,
  statementsCsv,
  type EventRow,
  type StatementInfo,
} from './statements'
import { parseStatementsView, selectRows } from './statementsView'

const info = (id: string, reviewed = false, v = 'aaaaaaaa'): StatementInfo => ({
  id,
  text: `Text of ${id}`,
  fits: [id.slice(0, 2).toUpperCase()],
  topic: 'home',
  reviewed,
  v,
})
const catalog = new Map(
  [info('pl-001'), info('br-002'), info('nl-003', true)].map((s) => [s.id, s]),
)

const round = (
  statementId: string,
  split: Record<string, number>,
  answer: string,
  v = 'aaaaaaaa',
): EventRow => ({
  type: 'round_result',
  data: JSON.stringify({ statementId, v, answer, split }),
})
const report = (statementId: string, reason: string, v = 'aaaaaaaa'): EventRow => ({
  type: 'report',
  data: JSON.stringify({ statementId, reason, v }),
})
const replaced = (statementId: string, why: string): EventRow => ({
  type: 'statement_replaced',
  data: JSON.stringify({ statementId, why, v: 'aaaaaaaa' }),
})

describe('aggregateStatements', () => {
  it('counts showings, correct answers, the culture picked instead, skips and reports', () => {
    const [s] = aggregateStatements(
      [
        round('br-002', { BR: 1, MX: 3, unknown: 1 }, 'BR'),
        round('br-002', { BR: 2, MX: 1 }, 'BR'),
        replaced('br-002', 'skip'),
        report('br-002', 'not_unique'),
      ],
      catalog,
    )
    expect(s).toMatchObject({
      id: 'br-002',
      culture: 'BR',
      shown: 2,
      answered: 8,
      correct: 3,
      unknown: 1,
      topWrong: { culture: 'MX', count: 4 },
      skips: 1,
      reports: { not_unique: 1 },
    })
  })

  it('counts "nobody knew" from revealed rounds and from older swap events', () => {
    const [s] = aggregateStatements(
      [
        round('pl-001', { unknown: 3 }, 'PL'),
        round('pl-001', { PL: 1, unknown: 2 }, 'PL'),
        replaced('pl-001', 'unknown'),
      ],
      catalog,
    )
    expect(s).toMatchObject({ id: 'pl-001', shown: 2, allUnknown: 2, skips: 0 })
  })

  it('flags offensive at once, then 2+ reasoned reports, then suspicious unreviewed rows', () => {
    const rows = aggregateStatements(
      [
        report('nl-003', 'offensive'),
        report('pl-001', 'incorrect'),
        report('pl-001', 'outdated'),
        ...Array.from({ length: 5 }, () => round('br-002', { BR: 0, MX: 4 }, 'BR')),
      ],
      catalog,
    )
    expect(rows.map((s) => [s.id, s.flag])).toEqual([
      ['nl-003', 'action'],
      ['pl-001', 'review'],
      ['br-002', 'watch'],
    ])
    expect(rows[2]!.flagWhy).toMatch(/MX/)
  })

  it('does not count "no reason given" towards the 2-report threshold', () => {
    const [s] = aggregateStatements([report('pl-001', 'none'), report('pl-001', 'none')], catalog)
    expect(s!.flag).toBeNull()
  })

  it('keeps events on older wording apart, and can leave them out', () => {
    const rows = [report('pl-001', 'incorrect', 'bbbbbbbb'), report('pl-001', 'outdated')]
    expect(aggregateStatements(rows, catalog)[0]).toMatchObject({
      olderWording: 1,
      reports: { incorrect: 1, outdated: 1 },
    })
    expect(aggregateStatements(rows, catalog, { currentOnly: true })[0]).toMatchObject({
      olderWording: 1,
      reports: { incorrect: 0, outdated: 1 },
    })
  })
})

describe('the review view', () => {
  it('shows flagged or reported rows by default, everything with ?show=all', () => {
    const rows = aggregateStatements(
      [round('nl-003', { NL: 3 }, 'NL'), report('pl-001', 'none')],
      catalog,
    )
    expect(selectRows(rows, parseStatementsView(new URLSearchParams())).map((s) => s.id)).toEqual([
      'pl-001',
    ])
    expect(selectRows(rows, parseStatementsView(new URLSearchParams('show=all'))).length).toBe(2)
    expect(
      selectRows(rows, parseStatementsView(new URLSearchParams('show=all&culture=NL'))).map(
        (s) => s.id,
      ),
    ).toEqual(['nl-003'])
  })
})

describe('statementsCsv', () => {
  it('quotes text and defuses spreadsheet formulas', () => {
    const odd = new Map([['pl-001', { ...info('pl-001'), text: '=HYPERLINK("x"), with "quotes"' }]])
    const csv = statementsCsv(aggregateStatements([report('pl-001', 'incorrect')], odd))
    const [header, line] = csv.trim().split('\r\n')
    expect(header).toMatch(/^id,flag,why,culture,topic,reviewed,shown,/)
    expect(line).toContain(`"'=HYPERLINK(""x""), with ""quotes"""`)
  })
})

describe('holdHealth', () => {
  it('summarises reports per game without player ids', () => {
    const h = holdHealth(10, [
      { gameId: 'a', heldMs: 2000, nth: 1, reason: 'incorrect' },
      { gameId: 'a', heldMs: 10000, nth: 2, reason: 'none' },
      { gameId: 'b', heldMs: 4000, nth: 1, reason: 'outdated' },
      ...[1, 2, 3, 4].map((nth) => ({ gameId: 'c', heldMs: 1000, nth, reason: 'none' })),
    ])
    expect(h).toMatchObject({
      games: 10,
      gamesWithReports: 3,
      buckets: { one: 1, few: 1, many: 1 },
      reports: 7,
      medianHoldMs: 1000,
      gamesWithHeavyReporter: 1,
      medianGameHoldMs: 4000,
    })
    expect(h.noReasonShare).toBeCloseTo(5 / 7)
  })
})
