// Sends anonymous product events to the Pages Function at /api/event (stored in D1).
// Fire-and-forget: a lost event never affects the game.
import type { AnalyticsEvent } from './events'

export type { AnalyticsEvent, PlayAgainVote } from './events'

const ENDPOINT = '/api/event'

export function track(event: AnalyticsEvent) {
  if (import.meta.env.DEV) console.debug('[track]', event)
  const body = JSON.stringify(isTestDevice() ? { ...event, test: true } : event)
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

const TEST_KEY = 'cc:test'
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * Remembers ?test=1 (or forgets it with ?test=0) on this device. Called once at startup,
 * so opening any page with the flag marks every later event from this device as a test.
 */
export function rememberTestFlag(search = location.search) {
  const flag = new URLSearchParams(search).get('test')
  try {
    if (flag === '1') localStorage.setItem(TEST_KEY, '1')
    else if (flag === '0') localStorage.removeItem(TEST_KEY)
  } catch {
    // Without storage the flag only lasts for this page.
  }
}

/** Developer devices: the dev server, a local host, or a device that opened a page with ?test=1. */
export function isTestDevice(): boolean {
  // The dev server counts too, so phones playtesting over Wi-Fi are covered.
  if (import.meta.env.DEV || LOCAL_HOSTS.includes(location.hostname)) return true
  if (new URLSearchParams(location.search).get('test') === '1') return true
  try {
    return localStorage.getItem(TEST_KEY) !== null
  } catch {
    return false
  }
}

export function alreadySent(key: string): boolean {
  try {
    return localStorage.getItem(sentKey(key)) !== null
  } catch {
    return false
  }
}
