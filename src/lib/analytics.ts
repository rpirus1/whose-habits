// Sends anonymous product events to the Pages Function at /api/event (stored in D1).
// Fire-and-forget: a lost event never affects the game.
import type { AnalyticsEvent } from './events'

export type { AnalyticsEvent, PlayAgainVote } from './events'

const ENDPOINT = '/api/event'

export function track(event: AnalyticsEvent) {
  if (import.meta.env.DEV) console.debug('[track]', event)
  const body = JSON.stringify(event)
  try {
    // sendBeacon survives the page closing (e.g. tapping "Host your own game").
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the game.
  }
}

/** Sends an event only once per device (e.g. game_finished after a refresh on the final screen). */
export function trackOnce(key: string, event: AnalyticsEvent) {
  const storageKey = sentKey(key)
  try {
    if (localStorage.getItem(storageKey)) return
    localStorage.setItem(storageKey, '1')
  } catch {
    // Without storage we may send twice; the queries de-duplicate by game id.
  }
  track(event)
}

const sentKey = (key: string) => `cc:sent:${key}`

export function alreadySent(key: string): boolean {
  try {
    return localStorage.getItem(sentKey(key)) !== null
  } catch {
    return false
  }
}
