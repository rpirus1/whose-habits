// The private stats Worker (culture-clash-stats), reading the game's D1 database:
//   /                 Dashboard: success signals, games per week, funnels, the metrics.sql tables
//   /statements       Review queue for reported and suspicious statements, plus report holds
//   /statements.csv   The same queue as CSV
// It lives apart from the public game so Cloudflare Access can guard its whole address.
// See docs/METRICS.md (access) and docs/ANALYTICS_NEXT.md (what the numbers mean).
import METRICS_SQL from '../scripts/metrics.sql'
import { accessKeys, verifyAccessToken } from './access'
import {
  DASHBOARD_SQL,
  dashboardNumbers,
  renderDashboardBody,
  type DashboardRow,
} from './dashboard'
import {
  filterParams,
  filterSql,
  parseFilters,
  renderLayout,
  splitQueries,
  type Filters,
} from './page'
import STATEMENTS from './statements.json'
import { localDay } from './time'
import {
  aggregateStatements,
  holdHealth,
  statementsCsv,
  type EventRow,
  type StatementInfo,
} from './statements'
import { parseStatementsView, renderStatementsBody, selectRows, viewParams } from './statementsView'

interface Env {
  DB: D1Database
  /** Secrets, set once Cloudflare Access is on (`wrangler secret put … -c stats/wrangler.toml`). */
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  /** Local development only (`npm run stats:local`): skips the Access check. */
  DEV_NO_ACCESS?: string
}

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET') {
      return new Response(null, { status: 405, headers: { Allow: 'GET' } })
    }
    if (!(await allowed(request, env))) {
      return new Response('Not allowed.', { status: 403, headers: HEADERS })
    }
    const url = new URL(request.url)
    const filters = parseFilters(url.searchParams, await realSince(env.DB))
    const now = new Date()
    const html = (body: string) =>
      new Response(body, { headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' } })

    switch (url.pathname) {
      case '/': {
        const params = filterParams(filters)
        const queries = splitQueries(METRICS_SQL)
        const [events, ...results] = await env.DB.batch<Record<string, unknown>>([
          env.DB.prepare(filterSql(DASHBOARD_SQL)).bind(...params),
          ...queries.map((q) => env.DB.prepare(filterSql(q.sql)).bind(...params)),
        ])
        const numbers = dashboardNumbers((events?.results ?? []) as unknown as DashboardRow[], {
          now,
          filters,
        })
        const details = queries.map((q, i) => ({ title: q.title, rows: results[i]?.results ?? [] }))
        return html(
          renderLayout({ path: '/', filters, now, body: renderDashboardBody(numbers, details) }),
        )
      }
      case '/statements':
      case '/statements.csv': {
        const view = parseStatementsView(url.searchParams)
        const { stats, hold } = await statementData(env.DB, filters, view.current)
        if (url.pathname === '/statements.csv') {
          return new Response(statementsCsv(selectRows(stats, view)), {
            headers: {
              ...HEADERS,
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="statements-review-${now.toISOString().slice(0, 10)}.csv"`,
            },
          })
        }
        const body = renderStatementsBody(stats, view, filters, hold, CULTURES, TOPICS)
        return html(
          renderLayout({ path: '/statements', filters, now, body, extra: viewParams(view) }),
        )
      }
      default:
        return new Response('Not found', { status: 404, headers: HEADERS })
    }
  },
} satisfies ExportedHandler<Env>

const CATALOG = new Map((STATEMENTS as StatementInfo[]).map((s) => [s.id, s]))
const CULTURES = [...new Set([...CATALOG.keys()].map((id) => id.slice(0, 2).toUpperCase()))].sort()
const TOPICS = [...new Set([...CATALOG.values()].map((s) => s.topic))].sort()

/**
 * The Amsterdam day of the first real event, or null while every event is a test. Real events
 * start when players use www.whosehabits.com (workers.dev, localhost and ?test=1 are tests).
 */
async function realSince(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare('SELECT MIN(created_at) AS first FROM events WHERE test = 0')
    .first<{ first: string | null }>()
  return row?.first ? localDay(row.first) : null
}

/** Statement signals and hold health for the filters. */
async function statementData(db: D1Database, filters: Filters, currentOnly: boolean) {
  const params = filterParams(filters)
  const [events, reports, games] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        filterSql(
          `SELECT type, data FROM events WHERE type IN ('round_result', 'statement_replaced', 'report') AND test = 0`,
        ),
      )
      .bind(...params),
    db
      .prepare(
        filterSql(
          `SELECT game_id, json_extract(data, '$.heldMs') AS heldMs, json_extract(data, '$.nth') AS nth,
            json_extract(data, '$.reason') AS reason FROM events WHERE type = 'report' AND test = 0`,
        ),
      )
      .bind(...params),
    db
      .prepare(
        filterSql(
          `SELECT COUNT(DISTINCT game_id) AS n FROM events WHERE type = 'game_started' AND test = 0`,
        ),
      )
      .bind(...params),
  ])
  const stats = aggregateStatements((events?.results ?? []) as unknown as EventRow[], CATALOG, {
    currentOnly,
  })
  const hold = holdHealth(
    Number(games?.results?.[0]?.n ?? 0),
    (reports?.results ?? []).map((r) => ({
      gameId: String(r.game_id),
      heldMs: typeof r.heldMs === 'number' ? r.heldMs : null,
      nth: typeof r.nth === 'number' ? r.nth : null,
      reason: String(r.reason ?? 'none'),
    })),
  )
  return { stats, hold }
}

async function allowed(request: Request, env: Env): Promise<boolean> {
  if (env.DEV_NO_ACCESS === '1' && new URL(request.url).hostname === 'localhost') return true
  // Not configured yet: nobody gets in.
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false
  const config = { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD }
  const email = await verifyAccessToken(
    request.headers.get('Cf-Access-Jwt-Assertion'),
    config,
    accessKeys(config.teamDomain),
  )
  return email !== null
}
