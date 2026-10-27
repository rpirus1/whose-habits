// Moving a room from a social app's built-in browser (Instagram, Facebook…) to the phone's own.
// The two keep separate storage, so a plain link opens the room as a stranger: the host would
// join their own game as a guest, a guest as a second player. "Open in browser" therefore carries
// this device's role with it.
//
// The payload rides in the query of public/continue.html, a static page the Worker never sees,
// so names and the game don't end up in the Worker's request logs. That page parks it in
// localStorage and opens the room; the room screen validates and applies it here. It's used
// once, expires after HANDOFF_TTL_MS, and never overwrites a room another browser already has.
// The sending browser marks the room as moved (savedRooms.markMovedToBrowser) and stops playing.
import type { GameState } from '@/game/types'
import {
  clearMovedToBrowser,
  loadGuestIdentity,
  loadHostGame,
  movedToBrowser,
  saveGuestIdentity,
  saveHostGame,
  type GuestIdentity,
} from './savedRooms'
import { keys, load, remove } from './storage'

/** Long enough to get past the "leaving the app" prompt, short enough not to linger. */
export const HANDOFF_TTL_MS = 2 * 60_000

export type HandoffRole = { host: GameState } | { guest: GuestIdentity }

type Payload = { v: 1; room: string; exp: number } & HandoffRole

/** The continue page's URL carrying this device's role in the room. */
export function handoffUrl(origin: string, room: string, role: HandoffRole, now = Date.now()) {
  const payload: Payload = { v: 1, room, exp: now + HANDOFF_TTL_MS, ...role }
  const params = new URLSearchParams({ r: room, d: encode(JSON.stringify(payload)) })
  return `${origin}/continue.html?${params}`
}

/**
 * Applies a handoff parked by the continue page, if it's for this room, fresh and well formed.
 * Returns the role it set up, or null. The parked payload is removed either way.
 */
export function receiveHandoff(room: string, now = Date.now()): 'host' | 'guest' | null {
  const raw = load<string>(keys.handoff)
  if (raw === undefined) return null
  remove(keys.handoff)
  const payload = decode(raw)
  if (!payload || payload.room !== room || payload.exp < now) return null
  // The app refused to open the phone's browser and loaded the page right here instead: this
  // is the browser that sent it, so it simply carries on.
  const sentFromHere = movedToBrowser(room)
  // Another browser that already has the room keeps it: never overwrite. Except a guest entry
  // when the host arrives: that's this phone, which opened the plain link here earlier.
  if (!sentFromHere && (loadHostGame(room) || (loadGuestIdentity(room) && !('host' in payload))))
    return null
  if ('host' in payload) {
    const state = payload.host
    if (state?.v !== 1 || state.roomCode !== room || typeof state.hostId !== 'string') return null
    remove(keys.guest(room))
    saveHostGame(state)
  } else {
    const guest = payload.guest
    if (typeof guest?.playerId !== 'string' || typeof guest.name !== 'string') return null
    saveGuestIdentity(room, { playerId: guest.playerId, name: guest.name, hostId: guest.hostId })
  }
  clearMovedToBrowser(room)
  return 'host' in payload ? 'host' : 'guest'
}

/** This device's role in the room, as saved here, for handing it over again. */
export function savedRole(room: string): HandoffRole | null {
  const host = loadHostGame(room)
  if (host) return { host }
  const guest = loadGuestIdentity(room)
  return guest ? { guest } : null
}

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(raw: string): Payload | null {
  try {
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Payload
    return payload?.v === 1 && typeof payload.room === 'string' && typeof payload.exp === 'number'
      ? payload
      : null
  } catch {
    return null
  }
}
