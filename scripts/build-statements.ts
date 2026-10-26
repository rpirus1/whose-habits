// Validates the statements CSV (STATEMENTS_SOURCE, the extended bank) and writes
// worker/statements.json, the bank the Worker deals each game's deck from (/api/deck), and
// src/content/pool.json, only each statement's `fits`, for the setup screen's counts.
// The app never gets the whole bank: see "Where statements live" in docs/CONTENT_RULES.md.
// Run: npm run content   (ONLY_REVIEWED=1 ships reviewed statements only;
// STATEMENTS=content/statements.csv builds from another CSV)
import { readFileSync, writeFileSync } from 'node:fs'
import { coverageReport, parseStatementsCsv, STATEMENTS_SOURCE } from './statements-lib.ts'

const SOURCE = process.env.STATEMENTS || STATEMENTS_SOURCE
const TARGET = 'worker/statements.json'
const POOL = 'src/content/pool.json'
const onlyReviewed = ['1', 'true', 'yes'].includes(process.env.ONLY_REVIEWED ?? '')

const { statements, errors, warnings } = parseStatementsCsv(readFileSync(SOURCE, 'utf8'))

for (const w of warnings) console.warn(`  warning  row ${w.row}: ${w.message}`)
if (errors.length) {
  for (const e of errors) console.error(`  error    row ${e.row}: ${e.message}`)
  console.error(`\n${SOURCE}: ${errors.length} error(s). Nothing was written.`)
  process.exit(1)
}

const shipped = onlyReviewed ? statements.filter((s) => s.reviewed) : statements
writeFileSync(TARGET, JSON.stringify(shipped, null, 1) + '\n')
writeFileSync(POOL, JSON.stringify(shipped.map((s) => s.fits)) + '\n')

console.log(coverageReport(statements))
console.log(
  `Wrote ${shipped.length} statements to ${TARGET}` +
    (onlyReviewed ? ' (reviewed only)' : ' (including unreviewed)'),
)
