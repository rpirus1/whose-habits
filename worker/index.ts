// Cloudflare Worker: serves the built app from dist/ (static assets) and handles the one
// API route. Static files, SPA routing and the _headers file are handled by the assets
// layer; only /api/* reaches this code (see run_worker_first in wrangler.toml).
import { MAX_EVENT_BYTES, parseEvent } from '../src/lib/events'
import { handleStats } from './stats'
import type { StatsEnv } from './stats'

interface Env extends StatsEnv {
  ASSETS: Fetcher
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/event') {
      return request.method === 'POST'
        ? handleEvent(request, env)
        : new Response(null, { status: 405, headers: { Allow: 'POST' } })
    }
    if (url.pathname === '/stats') return handleStats(request, env)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

/** Stores one anonymous product event in D1. Only known, validated fields are kept. */
async function handleEvent(request: Request, env: Env): Promise<Response> {
  // Only our own pages may post (blocks drive-by cross-site spam; not a security boundary).
  const origin = request.headers.get('Origin')
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 })

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
  await env.DB.prepare('INSERT INTO events (type, game_id, data, test) VALUES (?, ?, ?, ?)')
    .bind(type, gameId, JSON.stringify(data), test ? 1 : 0)
    .run()
  return new Response(null, { status: 204 })
}
