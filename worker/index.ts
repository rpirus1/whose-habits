// Cloudflare Worker: serves the built app from dist/ (static assets) and handles the API
// route. It sees every request first (run_worker_first = true in wrangler.toml), so it can
// send the old addresses to www.whosehabits.com. Then static files (including the
// prerendered lander at /, with their _headers) come from the assets binding, and requests
// that matched no file get the app shell.
// The stats page is a separate, private Worker (stats/).
import { isPreviewHost, MAX_EVENT_BYTES, parseEvent } from '../src/lib/events'
import { canonicalRedirect, fromOwnPage, routeRequest, SHELL_PATH } from './routes'
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
    const canonical = canonicalRedirect(url)
    if (canonical) return Response.redirect(canonical, 301)
    if (url.pathname === '/api/event') {
      return request.method === 'POST'
        ? handleEvent(request, env)
        : new Response(null, { status: 405, headers: { Allow: 'POST' } })
    }
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== 404) return asset
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
  for (const [k, v] of Object.entries(route.headers)) headers.set(k, v)
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

  // Lander clicks and join steps happen outside a game: stored with an empty game id.
  const { type, gameId, test, ...data } = event
  const isTest = test || isPreviewHost(new URL(request.url).hostname)
  await env.DB.prepare('INSERT INTO events (type, game_id, data, test) VALUES (?, ?, ?, ?)')
    .bind(type, gameId ?? '', JSON.stringify(data), isTest ? 1 : 0)
    .run()
  return new Response(null, { status: 204 })
}
