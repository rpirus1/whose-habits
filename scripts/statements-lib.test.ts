import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eligibleCount, parseStatementsCsv, STATEMENTS_SOURCE } from './statements-lib.ts'

const HEADER = 'id,text,fits,note,obviousness,topic,source,reviewed,reviewer,comments'
const good =
  'nl-001,"A friend says ""I\'ll leave now, so you can have dinner"".",NL,"Dinner is early.",2,hosting,AI-generated,yes,,'

describe('parseStatementsCsv', () => {
  it('parses a valid row, including quotes and commas in text', () => {
    const { statements, errors } = parseStatementsCsv(`${HEADER}\n${good}\n`)
    expect(errors).toEqual([])
    expect(statements).toEqual([
      {
        id: 'nl-001',
        text: 'A friend says "I\'ll leave now, so you can have dinner".',
        fits: ['NL'],
        note: 'Dinner is early.',
        obviousness: 2,
        topic: 'hosting',
        reviewed: true,
      },
    ])
  })

  it('accepts a BOM, semicolon delimiter, blank lines and messy fits', () => {
    const csv =
      '﻿' +
      HEADER.replaceAll(',', ';') +
      '\n\nbr-001;Arriving late to a house party is normal.;br, mx;Loose start times.;1;Hosting;https://example.com/party;;;\n'
    const { statements, errors } = parseStatementsCsv(csv)
    expect(errors).toEqual([])
    expect(statements[0].fits).toEqual(['BR', 'MX'])
    expect(statements[0].reviewed).toBe(false)
  })

  it('reports spreadsheet row numbers for every problem', () => {
    const csv = [
      HEADER,
      good,
      'nl-001,"A friend says ""I\'ll leave now, so you can have dinner"".",NL,x,2,hosting,AI-generated,,,', // dup id + text
      'xx-1,Short,ZZ,,5,food,,maybe,,',
      'pl-002,Some statement that is long enough to pass.,UA,Note.,1,family,AI-generated,,,', // fits lacks PL
    ].join('\n')
    const { errors, statements } = parseStatementsCsv(csv)
    expect(statements.map((s) => s.id)).toEqual(['nl-001'])
    const rows = (r: number) => errors.filter((e) => e.row === r).map((e) => e.message)
    expect(rows(3)).toEqual(['id "nl-001" already used on row 2', 'same text as row 2'])
    expect(rows(4)).toHaveLength(8)
    expect(rows(5)).toEqual(['fits must include PL (the culture in the id)'])
  })

  it('fails on missing columns', () => {
    const { errors } = parseStatementsCsv('id,text\n')
    expect(errors[0].message).toMatch(/fits, note, obviousness, topic, source, reviewed/)
  })

  it('warns when a statement claims exclusivity', () => {
    const csv = `${HEADER}\nus-001,People here only tip in cash at restaurants.,US,Note.,1,home,AI-generated,,,`
    expect(parseStatementsCsv(csv).warnings).toHaveLength(1)
  })

  it('requires a source: a URL or "AI-generated"', () => {
    const row = (source: string) =>
      parseStatementsCsv(`${HEADER}
nl-001,A statement that is long enough.,NL,Note.,1,home,${source},,,`).errors
    expect(row('https://www.reddit.com/r/Netherlands/comments/abc')).toEqual([])
    expect(row('ai-generated')).toEqual([])
    expect(row('')).toHaveLength(1)
    expect(row('Wikipedia')).toHaveLength(1)
  })

  it('keeps the bundled statements file valid', () => {
    const { errors } = parseStatementsCsv(readFileSync(STATEMENTS_SOURCE, 'utf8'))
    expect(errors).toEqual([])
  })
})

describe('eligibleCount (ambiguity rule)', () => {
  const { statements } = parseStatementsCsv(
    [
      HEADER,
      'br-001,Arriving late to a house party is normal.,BR MX,Note.,1,hosting,AI-generated,,,',
      'br-002,Friends greet with cheek kisses by city.,BR,Note.,2,home,AI-generated,,,',
    ].join('\n'),
  )
  it('uses a statement only when exactly one selected culture fits', () => {
    expect(eligibleCount(statements, ['BR', 'MX'])).toBe(1)
    expect(eligibleCount(statements, ['BR', 'US'])).toBe(2)
    expect(eligibleCount(statements, ['MX', 'US'])).toBe(1)
    expect(eligibleCount(statements, ['NL', 'US'])).toBe(0)
  })
})
