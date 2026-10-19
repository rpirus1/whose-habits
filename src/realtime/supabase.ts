import { RealtimeClient } from '@supabase/realtime-js'

/**
 * A fresh Supabase Realtime client (one WebSocket). Each room connection gets its own,
 * so closing one room can never hand a half-closed channel to the next.
 * Throws a clear error when the env vars are missing.
 */
export function createRealtimeClient(): RealtimeClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.',
    )
  }
  return new RealtimeClient(`${url.replace(/\/$/, '')}/realtime/v1`, { params: { apikey: key } })
}
