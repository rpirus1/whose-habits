// Writes stats/statements.json: every statement the game may ship (both CSVs, merged by id,
// the extended file first), with its current version. The private stats Worker uses it to show
// a reported statement's text, topic and review state. Run: npm run stats:content
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { statementVersion } from '../src/lib/events.ts'
import { parseStatementsCsv } from './statements-lib.ts'

const SOURCES = ['content/statements-extended.csv', 'content/statements.csv']
const TARGET = 'stats/statements.json'

const byId = new Map<string, object>()
for (const source of SOURCES) {
  if (!existsSync(source)) continue
  const { statements } = parseStatementsCsv(readFileSync(source, 'utf8'))
  for (const s of statements) {
    if (byId.has(s.id)) continue
    byId.set(s.id, {
      id: s.id,
      text: s.text,
      fits: s.fits,
      topic: s.topic,
      reviewed: s.reviewed,
      v: statementVersion(s),
    })
  }
}

writeFileSync(TARGET, JSON.stringify([...byId.values()]) + '\n')
console.log(`Wrote ${byId.size} statements to ${TARGET}`)
