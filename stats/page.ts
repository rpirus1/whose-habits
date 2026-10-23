// The stats page's HTML and the splitting of scripts/metrics.sql into queries (pure, tested).

export interface Query {
  title: string
  sql: string
}

export interface QueryResult {
  title: string
  rows: Record<string, unknown>[]
}

/** Which events to count: everything (incl. test events), or real players only. */
export type DataScope = 'all' | 'real'

/** Page filters from the URL. Dates are UTC days (YYYY-MM-DD), both inclusive; null = open. */
export interface Filters {
  scope: DataScope
  from: string | null
  to: string | null
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const validDay = (v: string | null): v is string =>
  !!v && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

/**
 * Until launch every event is a test (workers.dev), so the page shows all events by default.
 * `?data=real` limits it to real players; `?from=` / `?to=` limit the dates.
 */
export function parseFilters(params: URLSearchParams): Filters {
  const scope: DataScope = params.get('data') === 'real' ? 'real' : 'all'
  let from = validDay(params.get('from')) ? params.get('from') : null
  let to = validDay(params.get('to')) ? params.get('to') : null
  if (from && to && from > to) [from, to] = [to, from]
  return { scope, from, to }
}

/**
 * metrics.sql filters every read of `events` with `test = 0` (so `npm run metrics` counts real
 * players only). The page swaps each of those for the filters, bound as ?1 (include tests),
 * ?2 (from) and ?3 (to, exclusive).
 */
export function filterSql(sql: string): string {
  return sql.replace(
    /\btest = 0\b/g,
    '(test = 0 OR ?1 = 1) AND created_at >= ?2 AND created_at < ?3',
  )
}

export function filterParams(f: Filters): [number, string, string] {
  return [
    f.scope === 'all' ? 1 : 0,
    f.from ? `${f.from}T00:00:00.000Z` : '',
    f.to ? `${addDays(f.to, 1)}T00:00:00.000Z` : '9999',
  ]
}

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Splits metrics.sql into its queries. Each query starts with a "-- N. Title" comment and ends
 * with a semicolon; the comments before the first query are the file's header.
 */
export function splitQueries(sql: string): Query[] {
  const queries: Query[] = []
  for (const chunk of sql.split(';')) {
    const title = chunk.match(/^-- \d+\. (.+)$/m)?.[1]?.trim()
    const body = chunk.trim()
    if (title && body) queries.push({ title, sql: body })
  }
  return queries
}

/** Presets, the date fields and the data switch. A plain GET form: works without JavaScript. */
function renderFilters(f: Filters, now: Date): string {
  const today = now.toISOString().slice(0, 10)
  const presets: { label: string; from: string | null; to: string | null }[] = [
    { label: 'Today', from: today, to: today },
    { label: '7 days', from: addDays(today, -6), to: today },
    { label: '30 days', from: addDays(today, -29), to: today },
    { label: 'All time', from: null, to: null },
  ]
  const link = (from: string | null, to: string | null, scope: DataScope) => {
    const p = new URLSearchParams()
    if (scope === 'real') p.set('data', 'real')
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    const q = p.toString()
    return q ? `?${q}` : '?'
  }
  const chips = presets
    .map((p) => {
      const active = p.from === f.from && p.to === f.to
      return `<a class="chip${active ? ' on' : ''}" href="${escape(link(p.from, p.to, f.scope))}">${p.label}</a>`
    })
    .join('')
  const option = (value: DataScope, label: string) =>
    `<option value="${value}"${f.scope === value ? ' selected' : ''}>${label}</option>`
  return `<form class="filters" method="get" action="">
<div class="chips">${chips}</div>
<div class="fields">
<label>From <input type="date" name="from" value="${escape(f.from ?? '')}" max="${today}"></label>
<label>To <input type="date" name="to" value="${escape(f.to ?? '')}" max="${today}"></label>
<label>Data <select name="data">${option('all', 'All events (incl. test)')}${option('real', 'Real players only')}</select></label>
<button type="submit">Apply</button>
</div>
</form>`
}

function describeFilters(f: Filters): string {
  const scope = f.scope === 'all' ? 'All events, including test events' : 'Real players only'
  const range =
    f.from && f.to
      ? f.from === f.to
        ? f.from
        : `${f.from} to ${f.to}`
      : f.from
        ? `from ${f.from}`
        : f.to
          ? `until ${f.to}`
          : 'all time'
  return `${scope} · ${range} (UTC days)`
}

export function renderStats(
  results: QueryResult[],
  now: Date,
  filters: Filters = { scope: 'all', from: null, to: null },
): string {
  const sections = results
    .map(({ title, rows }) => {
      const columns = Object.keys(rows[0] ?? {})
      const table = rows.length
        ? `<table><thead><tr>${columns.map((c) => `<th>${escape(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows
            .map((r) => `<tr>${columns.map((c) => `<td>${escape(r[c])}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
        : '<p class="empty">No data yet.</p>'
      return `<section><h2>${escape(title)}</h2>${table}</section>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Culture Clash stats</title>
<style>
  :root { color-scheme: light dark; --fg: #111; --bg: #fff; --muted: #666; --line: #ddd; }
  @media (prefers-color-scheme: dark) { :root { --fg: #eee; --bg: #111; --muted: #999; --line: #333; } }
  body { margin: 0 auto; max-width: 960px; padding: 16px; font: 15px/1.4 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 8px; }
  .meta, .empty { color: var(--muted); }
  section { overflow-x: auto; }
  table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
  th { font-weight: 600; font-size: 13px; color: var(--muted); }
  .filters { margin: 16px 0 8px; display: flex; flex-direction: column; gap: 10px; }
  .chips, .fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .chip { padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--fg); text-decoration: none; font-size: 14px; }
  .chip.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  label { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; }
  input, select, button { font: inherit; font-size: 14px; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; }
  button { cursor: pointer; }
</style>
</head>
<body>
<h1>Culture Clash stats</h1>
${renderFilters(filters, now)}
<p class="meta">${escape(describeFilters(filters))}. Updated ${escape(now.toISOString().slice(0, 16).replace('T', ' '))} UTC. Definitions: docs/METRICS.md.</p>
${sections}
</body>
</html>`
}

function escape(value: unknown): string {
  return String(value ?? '–').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}
