// POST /api/event: stores one anonymous product event in D1.
// Validation is shared with the app (src/lib/events.ts), so only known fields are kept.
import { MAX_EVENT_BYTES, parseEvent } from '../../src/lib/events'

interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  const { type, gameId, ...data } = event
  await env.DB.prepare('INSERT INTO events (type, game_id, data) VALUES (?, ?, ?)')
    .bind(type, gameId, JSON.stringify(data))
    .run()
  return new Response(null, { status: 204 })
}
