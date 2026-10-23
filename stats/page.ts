// Shared parts of the stats pages: filters, layout, tables, and splitting metrics.sql (pure, tested).
import { addDays, dayStartUtc, formatDay, localDateTime, localDay } from './time'

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

/** Page filters from the URL. Dates are Amsterdam days (YYYY-MM-DD), both inclusive; null = open. */
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
 * Every query filters each read of `events` with `test = 0` (so `npm run metrics` counts real
 * players only). The pages swap each of those for the filters, bound as ?1 (include tests),
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
    f.from ? dayStartUtc(f.from) : '',
    f.to ? dayStartUtc(addDays(f.to, 1)) : '9999',
  ]
}

export { addDays }

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

/** The pages of the stats site, in nav order. */
export const PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/statements', label: 'Statements' },
] as const

/** Query string for the shared filters plus any page-specific ones (`extra`). */
export function filterQuery(f: Filters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams()
  if (f.scope === 'real') p.set('data', 'real')
  if (f.from) p.set('from', f.from)
  if (f.to) p.set('to', f.to)
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v)
  const q = p.toString()
  return q ? `?${q}` : '?'
}

/** Presets, the date fields and the data switch. A plain GET form: works without JavaScript. */
function renderFilters(f: Filters, now: Date, extra: Record<string, string>): string {
  const today = localDay(now)
  const presets: { label: string; from: string | null; to: string | null }[] = [
    { label: 'Today', from: today, to: today },
    { label: '7 days', from: addDays(today, -6), to: today },
    { label: '30 days', from: addDays(today, -29), to: today },
    { label: 'All time', from: null, to: null },
  ]
  const chips = presets
    .map((p) => {
      const active = p.from === f.from && p.to === f.to
      const href = filterQuery({ ...f, from: p.from, to: p.to }, extra)
      return `<a class="chip${active ? ' on' : ''}" href="${escape(href)}">${p.label}</a>`
    })
    .join('')
  const option = (value: DataScope, label: string) =>
    `<option value="${value}"${f.scope === value ? ' selected' : ''}>${label}</option>`
  const hidden = Object.entries(extra)
    .filter(([, v]) => v)
    .map(([k, v]) => `<input type="hidden" name="${escape(k)}" value="${escape(v)}">`)
    .join('')
  return `<form class="filters" method="get" action="">
<div class="chips">${chips}</div>
<div class="fields">
<label>From <input type="date" name="from" value="${escape(f.from ?? '')}" max="${today}"></label>
<label>To <input type="date" name="to" value="${escape(f.to ?? '')}" max="${today}"></label>
<label>Data <select name="data">${option('all', 'All events (incl. test)')}${option('real', 'Real players only')}</select></label>
${hidden}<button type="submit">Apply</button>
</div>
</form>`
}

function describeFilters(f: Filters): string {
  const scope = f.scope === 'all' ? 'All events, including test events' : 'Real players only'
  const range =
    f.from && f.to
      ? f.from === f.to
        ? formatDay(f.from)
        : `${formatDay(f.from)} to ${formatDay(f.to)}`
      : f.from
        ? `from ${formatDay(f.from)}`
        : f.to
          ? `until ${formatDay(f.to)}`
          : 'all time'
  return `${scope} · ${range} (Amsterdam time)`
}

/** Dates in query results (YYYY-MM-DD) are shown as DD/MM/YYYY. */
const showDate = (v: unknown) => (typeof v === 'string' && DAY.test(v) ? formatDay(v) : v)

/** A plain table from query rows (column names as headers). */
export function renderTable(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '<p class="empty">No data yet.</p>'
  const columns = Object.keys(rows[0]!)
  const head = columns.map((c) => `<th>${escape(c)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escape(showDate(r[c]))}</td>`).join('')}</tr>`)
    .join('')
  return `<div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

export function renderSections(results: QueryResult[]): string {
  return results
    .map(({ title, rows }) => `<section><h2>${escape(title)}</h2>${renderTable(rows)}</section>`)
    .join('')
}

export interface LayoutOptions {
  path: string
  filters: Filters
  now: Date
  body: string
  /** Page-specific URL params to keep when the shared filters change. */
  extra?: Record<string, string>
}

export function renderLayout({ path, filters, now, body, extra = {} }: LayoutOptions): string {
  const nav = PAGES.map(
    (p) =>
      `<a href="${escape(p.path + filterQuery(filters))}"${p.path === path ? ' aria-current="page"' : ''}>${p.label}</a>`,
  ).join('')
  const updated = localDateTime(now)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Culture Clash stats</title>
<style>${STYLES}</style>
</head>
<body>
<header><h1>Culture Clash stats</h1><nav>${nav}</nav></header>
${renderFilters(filters, now, extra)}
<p class="meta">${escape(describeFilters(filters))}. Updated ${escape(updated)}. Definitions: docs/METRICS.md and docs/ANALYTICS_NEXT.md.</p>
${body}
</body>
</html>`
}

/** The metrics.sql tables as one page (the dashboard shows them under "All numbers"). */
export function renderStats(
  results: QueryResult[],
  now: Date,
  filters: Filters = { scope: 'all', from: null, to: null },
): string {
  return renderLayout({ path: '/', filters, now, body: renderSections(results) })
}

export function escape(value: unknown): string {
  return String(value ?? '–').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

const STYLES = `
  :root { color-scheme: light dark; --fg: #111; --bg: #fff; --muted: #666; --line: #ddd; --card: #f4f4f5; --accent: #7c3aed; --ok: #15803d; --warn: #b45309; --bad: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --fg: #eee; --bg: #111; --muted: #999; --line: #333; --card: #1d1d20; --accent: #a78bfa; --ok: #4ade80; --warn: #fbbf24; --bad: #f87171; } }
  body { margin: 0 auto; max-width: 1100px; padding: 16px; font: 15px/1.4 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
  header { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: baseline; }
  nav { display: flex; gap: 14px; }
  nav a { color: var(--muted); text-decoration: none; font-weight: 600; }
  nav a[aria-current] { color: var(--fg); border-bottom: 2px solid var(--accent); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 8px; }
  a { color: var(--accent); }
  .meta, .empty, .hint { color: var(--muted); }
  .hint { font-size: 13px; margin: 4px 0 8px; }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; vertical-align: top; }
  th { font-weight: 600; font-size: 13px; color: var(--muted); }
  td.text { white-space: normal; min-width: 240px; max-width: 420px; }
  .filters { margin: 16px 0 8px; display: flex; flex-direction: column; gap: 10px; }
  .chips, .fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .chip { padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--fg); text-decoration: none; font-size: 14px; }
  .chip.on { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  label { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; }
  input, select, button { font: inherit; font-size: 14px; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; }
  button { cursor: pointer; }
  .button { display: inline-block; padding: 4px 12px; border: 1px solid var(--line); border-radius: 6px; text-decoration: none; color: var(--fg); font-size: 14px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
  .tile { background: var(--card); border-radius: 12px; padding: 12px 14px; }
  .tile .label, .tile .sub { font-size: 13px; color: var(--muted); }
  .tile .value { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .tile.ok .value { color: var(--ok); }
  .tile.warn .value { color: var(--warn); }
  .funnel { display: flex; flex-wrap: wrap; gap: 6px; align-items: stretch; }
  .step { background: var(--card); border-radius: 10px; padding: 8px 12px; min-width: 100px; }
  .step .n { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .step .label, .step .pct { font-size: 13px; color: var(--muted); }
  .arrow { align-self: center; color: var(--muted); }
  .flag { display: inline-block; font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
  .flag.action { background: var(--bad); color: var(--bg); }
  .flag.review { background: var(--warn); color: var(--bg); }
  .flag.watch { border: 1px solid var(--warn); color: var(--warn); }
  details { margin-top: 28px; }
  summary { cursor: pointer; font-weight: 600; }
  svg text { fill: var(--muted); font-size: 11px; }
  svg text.num { fill: var(--fg); font-weight: 600; }
  svg text.axis { fill: var(--fg); font-size: 12px; font-weight: 600; }
  svg .bar { fill: var(--accent); }
  svg .bar-other { fill: var(--line); }
  .stack-block { margin: 10px 0 16px; max-width: 640px; }
  .stack-title { font-weight: 600; margin-bottom: 6px; }
  .stack { display: flex; height: 26px; border-radius: 6px; overflow: hidden; background: var(--card); }
  .seg.yes, .dot.yes { background: var(--ok); }
  .seg.maybe, .dot.maybe { background: var(--warn); }
  .seg.no, .dot.no { background: var(--bad); }
  .seg.none, .dot.none { background: var(--line); }
  .dot.yes-bar { background: var(--accent); }
  .dot.other-bar { background: var(--line); }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 6px; font-size: 14px; }
  .key { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
`
