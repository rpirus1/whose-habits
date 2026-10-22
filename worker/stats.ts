// GET /stats: a read-only page with the metrics from scripts/metrics.sql (the same file
// `npm run metrics` runs), behind HTTP Basic auth. The password is the STATS_TOKEN secret
// (`wrangler secret put STATS_TOKEN`); without it the page doesn't exist.
import METRICS_SQL from '../scripts/metrics.sql'
import { renderStats, splitQueries } from './statsPage'
import { withinLimit } from './rateLimit'

export interface StatsEnv {
  DB: D1Database
  STATS_TOKEN?: string
  /** Requests (so password guesses) per IP address (wrangler.toml). */
  STATS_LIMIT?: RateLimit
}

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
}

export async function handleStats(request: Request, env: StatsEnv): Promise<Response> {
  if (!env.STATS_TOKEN) return new Response('Not found', { status: 404 })
  if (request.method !== 'GET')
    return new Response(null, { status: 405, headers: { Allow: 'GET' } })
  if (!(await withinLimit(env.STATS_LIMIT, request))) {
    return new Response('Too many attempts. Try again in a minute.', {
      status: 429,
      headers: HEADERS,
    })
  }
  if (!(await authorized(request, env.STATS_TOKEN))) {
    return new Response('Password required', {
      status: 401,
      headers: { ...HEADERS, 'WWW-Authenticate': 'Basic realm="Culture Clash stats"' },
    })
  }

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
}

/** Basic auth with any user name; compares hashes so the check takes the same time either way. */
async function authorized(request: Request, token: string): Promise<boolean> {
  const header = request.headers.get('Authorization') ?? ''
  if (!header.startsWith('Basic ')) return false
  let password: string
  try {
    password = atob(header.slice(6)).split(':').slice(1).join(':')
  } catch {
    return false
  }
  const [a, b] = await Promise.all([sha256(password), sha256(token)])
  return crypto.subtle.timingSafeEqual(a, b)
}

const sha256 = (text: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
