// The private stats Worker (culture-clash-stats): one page with the metrics from
// scripts/metrics.sql (the same file `npm run metrics` runs), read from the game's D1 database.
// It lives apart from the public game so Cloudflare Access can guard its whole address:
// only the allowed email gets in, via a one-time code sent to that inbox. See docs/METRICS.md.
import METRICS_SQL from '../scripts/metrics.sql'
import { accessKeys, verifyAccessToken } from './access'
import { renderStats, splitQueries } from './page'

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
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
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
    if (url.pathname !== '/') return new Response('Not found', { status: 404, headers: HEADERS })

    const queries = splitQueries(METRICS_SQL)
    const results = await env.DB.batch<Record<string, unknown>>(
      queries.map((q) => env.DB.prepare(q.sql)),
    )
    const page = renderStats(
      queries.map((q, i) => ({ title: q.title, rows: results[i]?.results ?? [] })),
      new Date(),
    )
    return new Response(page, {
      headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
    })
  },
} satisfies ExportedHandler<Env>

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
