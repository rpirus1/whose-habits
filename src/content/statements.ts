import type { Statement } from './schema'
// Generated from content/statements.csv by `npm run content` (runs before dev and build).
import data from './statements.json'

export const STATEMENTS = data as Statement[]
export const STATEMENT_MAP: ReadonlyMap<string, Statement> = new Map(
  STATEMENTS.map((s) => [s.id, s]),
)
