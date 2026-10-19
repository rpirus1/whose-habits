// Pure parsing and validation for content/statements.csv.
// Used by build-statements.ts (plain Node) and by the unit tests.
import Papa from 'papaparse'
import { CULTURE_CODES, TOPICS } from '../src/content/schema.ts'
import type { CultureCode, Obviousness, Statement, Topic } from '../src/content/schema.ts'

export const REQUIRED_COLUMNS = ['id', 'text', 'fits', 'note', 'obviousness', 'topic', 'reviewed']
export const MAX_TEXT_LENGTH = 160
export const MIN_TEXT_LENGTH = 15
export const MAX_NOTE_LENGTH = 200

export interface Issue {
  /** Row number as shown in a spreadsheet (header = row 1). 0 = whole file. */
  row: number
  message: string
}

export interface ParseResult {
  statements: Statement[]
  errors: Issue[]
  warnings: Issue[]
}

const ID_PATTERN = /^([a-z]{2})-(\d{3})$/
const YES = new Set(['yes', 'y', 'true', 'x', '1'])
const NO = new Set(['', 'no', 'n', 'false', '0'])

export function parseStatementsCsv(csv: string): ParseResult {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const statements: Statement[] = []

  // Excel adds a BOM; the delimiter is auto-detected (some Excel locales export with ";").
  const parsed = Papa.parse<string[]>(csv.replace(/^﻿/, ''), { skipEmptyLines: false })
  const [header = [], ...rows] = parsed.data
  const columns = header.map((h) => h.trim().toLowerCase())

  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length) {
    errors.push({ row: 1, message: `Missing column(s): ${missing.join(', ')}` })
    return { statements, errors, warnings }
  }
  const col = (cells: string[], name: string) => (cells[columns.indexOf(name)] ?? '').trim()

  const seenIds = new Map<string, number>()
  const seenTexts = new Map<string, number>()

  rows.forEach((cells, index) => {
    const row = index + 2
    if (cells.every((c) => c.trim() === '')) return
    const rowErrors: string[] = []

    const id = col(cells, 'id')
    const idMatch = ID_PATTERN.exec(id)
    const idCulture = idMatch?.[1].toUpperCase()
    if (!idMatch) rowErrors.push(`id "${id}" must look like "nl-007"`)
    else if (!isCulture(idCulture!)) rowErrors.push(`id prefix "${idMatch[1]}" is not a culture`)
    if (seenIds.has(id)) rowErrors.push(`id "${id}" already used on row ${seenIds.get(id)}`)
    else if (id) seenIds.set(id, row)

    const text = col(cells, 'text')
    if (text.length < MIN_TEXT_LENGTH) rowErrors.push(`text is empty or too short`)
    if (text.length > MAX_TEXT_LENGTH)
      rowErrors.push(`text is ${text.length} characters (max ${MAX_TEXT_LENGTH})`)
    const textKey = text.toLowerCase().replace(/\W+/g, ' ').trim()
    if (textKey && seenTexts.has(textKey))
      rowErrors.push(`same text as row ${seenTexts.get(textKey)}`)
    else if (textKey) seenTexts.set(textKey, row)
    if (/\bonly\b/i.test(text))
      warnings.push({
        row,
        message: `text says "only"; prefer wording that doesn't claim exclusivity`,
      })

    const fitsRaw = col(cells, 'fits')
      .toUpperCase()
      .split(/[\s,;/]+/)
      .filter(Boolean)
    const badFits = fitsRaw.filter((f) => !isCulture(f))
    if (!fitsRaw.length) rowErrors.push('fits is empty')
    if (badFits.length) rowErrors.push(`unknown culture(s) in fits: ${badFits.join(', ')}`)
    const fits = [...new Set(fitsRaw.filter(isCulture))]
    if (idCulture && isCulture(idCulture) && fits.length && !fits.includes(idCulture))
      rowErrors.push(`fits must include ${idCulture} (the culture in the id)`)

    const note = col(cells, 'note')
    if (!note) rowErrors.push('note is empty')
    if (note.length > MAX_NOTE_LENGTH)
      rowErrors.push(`note is ${note.length} characters (max ${MAX_NOTE_LENGTH})`)

    const obviousness = Number(col(cells, 'obviousness'))
    if (![1, 2, 3].includes(obviousness)) rowErrors.push('obviousness must be 1, 2 or 3')

    const topic = col(cells, 'topic').toLowerCase()
    if (!(TOPICS as readonly string[]).includes(topic))
      rowErrors.push(`topic "${topic}" must be one of: ${TOPICS.join(', ')}`)

    const reviewedRaw = col(cells, 'reviewed').toLowerCase()
    if (!YES.has(reviewedRaw) && !NO.has(reviewedRaw))
      rowErrors.push(`reviewed "${reviewedRaw}" must be "yes" or empty`)

    if (rowErrors.length) {
      errors.push(...rowErrors.map((message) => ({ row, message })))
      return
    }
    statements.push({
      id,
      text,
      fits,
      note,
      obviousness: obviousness as Obviousness,
      topic: topic as Topic,
      reviewed: YES.has(reviewedRaw),
    })
  })

  for (const error of parsed.errors) {
    errors.push({ row: (error.row ?? -1) + 1, message: `CSV format: ${error.message}` })
  }
  return { statements, errors, warnings }
}

function isCulture(value: string): value is CultureCode {
  return (CULTURE_CODES as readonly string[]).includes(value)
}

/** Statements usable when exactly these cultures are selected (the ambiguity rule). */
export function eligibleCount(statements: Statement[], selected: CultureCode[]): number {
  return statements.filter((s) => s.fits.filter((f) => selected.includes(f)).length === 1).length
}

export function coverageReport(statements: Statement[]): string {
  const lines: string[] = []
  const count = <T>(pick: (s: Statement) => T) => {
    const m = new Map<T, number>()
    for (const s of statements) m.set(pick(s), (m.get(pick(s)) ?? 0) + 1)
    return m
  }
  const byCulture = count((s) => s.id.slice(0, 2).toUpperCase())
  const byObv = count((s) => s.obviousness)
  const byTopic = count((s) => s.topic)
  const reviewed = statements.filter((s) => s.reviewed).length

  lines.push(`${statements.length} statements, ${reviewed} reviewed`)
  lines.push(
    'By culture:     ' + CULTURE_CODES.map((c) => `${c} ${byCulture.get(c) ?? 0}`).join('  '),
  )
  lines.push(
    'By obviousness: ' + ([1, 2, 3] as const).map((o) => `${o}: ${byObv.get(o) ?? 0}`).join('  '),
  )
  lines.push('By topic:       ' + TOPICS.map((t) => `${t} ${byTopic.get(t) ?? 0}`).join('  '))

  // The smallest 2-culture game is the tightest pool; it must cover 20 rounds plus replacements.
  let tightest = { pair: '', n: Infinity }
  for (let i = 0; i < CULTURE_CODES.length; i++)
    for (let j = i + 1; j < CULTURE_CODES.length; j++) {
      const pair = [CULTURE_CODES[i], CULTURE_CODES[j]]
      const n = eligibleCount(statements, pair)
      if (n < tightest.n) tightest = { pair: pair.join('+'), n }
    }
  lines.push(`Smallest 2-culture pool: ${tightest.pair} with ${tightest.n} statements`)
  return lines.join('\n')
}
