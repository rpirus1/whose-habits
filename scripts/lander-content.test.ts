import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HERO_QUESTION, SAMPLES } from '../src/lander/content.ts'
import { parseStatementsCsv } from './statements-lib.ts'

const { statements } = parseStatementsCsv(readFileSync('content/statements.csv', 'utf8'))
const byId = new Map(statements.map((s) => [s.id, s]))

describe('landing page samples', () => {
  it.each([...SAMPLES, HERO_QUESTION].map((s) => [s.id, s]))('%s still matches content/statements.csv', (id, s) => {
    const row = byId.get(id)
    expect(row, `${id} is gone from the CSV: pick another sample`).toBeDefined()
    expect({ text: s.text, fits: s.fits, note: s.note }).toEqual({
      text: row!.text,
      fits: row!.fits,
      note: row!.note,
    })
  })

  it('offers exactly one right answer in the hero question', () => {
    const fits = new Set(HERO_QUESTION.fits)
    expect(HERO_QUESTION.options.filter((c) => fits.has(c))).toHaveLength(1)
  })
})
