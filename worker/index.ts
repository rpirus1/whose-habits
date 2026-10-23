// Cloudflare Worker: serves the built app from dist/ (static assets) and handles the API
// route. Static files (including the prerendered lander at /) and the _headers file are
// handled by the assets layer. This code sees /api/* first (run_worker_first in
// wrangler.toml), and every request that matched no file: those get the app shell.
// The stats page is a separate, private Worker (stats/).
import { isPreviewHost, MAX_EVENT_BYTES, parseEvent } from '../src/lib/events'
import { fromOwnPage, PRIVATE_HEADERS, routeRequest, SHELL_PATH } from './routes'
import { withinLimit } from './rateLimit'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  /** Events per IP address (wrangler.toml). Optional so tests and older configs still run. */
  EVENT_LIMIT?: RateLimit
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/event') {
      return request.method === 'POST'
        ? handleEvent(request, env)
        : new Response(null, { status: 405, headers: { Allow: 'POST' } })
    }
    return serveApp(request, url, env)
  },
} satisfies ExportedHandler<Env>

/** Game routes and unknown pages get the app shell; /join redirects to the room. */
async function serveApp(request: Request, url: URL, env: Env): Promise<Response> {
  const route = routeRequest(url)
  if (route.kind === 'redirect') return Response.redirect(new URL(route.location, url).href, 302)
  if (route.kind === 'missing') return env.ASSETS.fetch(request)

  const shell = await env.ASSETS.fetch(new URL(SHELL_PATH, url))
  const headers = new Headers(shell.headers)
  // _headers rules match the asset's path (/app), not this URL, so set these here.
  if (route.private) for (const [k, v] of Object.entries(PRIVATE_HEADERS)) headers.set(k, v)
  return new Response(request.method === 'HEAD' ? null : shell.body, {
    status: route.status,
    headers,
  })
}

/** Stores one anonymous product event in D1. Only known, validated fields are kept. */
async function handleEvent(request: Request, env: Env): Promise<Response> {
  if (!fromOwnPage(request)) return new Response(null, { status: 403 })
  if (!(await withinLimit(env.EVENT_LIMIT, request))) return new Response(null, { status: 429 })

  const text = await request.text()
  if (text.length > MAX_EVENT_BYTES) return new Response(null, { status: 413 })

  let event
  try {
    event = parseEvent(JSON.parse(text))
  } catch {
    event = null
  }
  if (!event) return new Response(null, { status: 400 })

  const { type, gameId, test, ...data } = event
  const isTest = test || isPreviewHost(new URL(request.url).hostname)
  await env.DB.prepare('INSERT INTO events (type, game_id, data, test) VALUES (?, ?, ?, ?)')
    .bind(type, gameId, JSON.stringify(data), isTest ? 1 : 0)
    .run()
  return new Response(null, { status: 204 })
}
