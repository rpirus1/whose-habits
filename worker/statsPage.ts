// Pure parts of the /stats page (see stats.ts): splitting metrics.sql and rendering HTML.

export interface Query {
  title: string
  sql: string
}

export interface QueryResult {
  title: string
  rows: Record<string, unknown>[]
}

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

export function renderStats(results: QueryResult[], now: Date): string {
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
</style>
</head>
<body>
<h1>Culture Clash stats</h1>
<p class="meta">Anonymous events, test devices excluded. Updated ${escape(now.toISOString().slice(0, 16).replace('T', ' '))} UTC. Definitions: docs/METRICS.md.</p>
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
