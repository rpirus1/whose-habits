// What a device remembers about rooms: the full game on the host's device, the player
// identity on a guest's. Entries expire, so old evenings don't pile up in storage.
import type { GameState } from '@/game/types'
import { keys, listKeys, load, remove, save } from './storage'

/** A party evening is long, but not this long. */
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000

export interface GuestIdentity {
  playerId: string
  name: string
  /** The host this guest first heard from; snapshots from anyone else are ignored. */
  hostId?: string
  /** Removed by the host, turned away (room full) or left: don't offer the room on Home. */
  removed?: 'kicked' | 'full' | 'left'
}

interface Saved<T> {
  savedAt: number
  value: T
}

export function saveHostGame(state: GameState) {
  save(keys.hostGame(state.roomCode), {
    savedAt: Date.now(),
    value: state,
  } satisfies Saved<GameState>)
}

export function loadHostGame(roomCode: string): GameState | undefined {
  const saved = fresh(load<Saved<GameState>>(keys.hostGame(roomCode)))
  return saved?.value.v === 1 ? saved.value : undefined
}

export function saveGuestIdentity(roomCode: string, identity: GuestIdentity) {
  save(keys.guest(roomCode), {
    savedAt: Date.now(),
    value: identity,
  } satisfies Saved<GuestIdentity>)
}

/** Remembers that this device was turned away, so Home stops offering the room. */
export function markGuestRemoved(roomCode: string, reason: 'kicked' | 'full' | 'left') {
  const identity = loadGuestIdentity(roomCode)
  if (identity && identity.removed !== reason) {
    saveGuestIdentity(roomCode, { ...identity, removed: reason })
  }
}

export function loadGuestIdentity(roomCode: string): GuestIdentity | undefined {
  return fresh(load<Saved<GuestIdentity>>(keys.guest(roomCode)))?.value
}

export interface SavedRoom {
  roomCode: string
  role: 'host' | 'guest'
  name: string
  savedAt: number
  finished: boolean
}

/** Rooms this device can rejoin, newest first. */
export function listSavedRooms(now = Date.now()): SavedRoom[] {
  const rooms: SavedRoom[] = []
  for (const key of listKeys(keys.hostGame(''))) {
    const saved = fresh(load<Saved<GameState>>(key), now)
    if (!saved) continue
    const state = saved.value
    rooms.push({
      roomCode: state.roomCode,
      role: 'host',
      name: state.players.find((p) => p.isHost)?.name ?? '',
      savedAt: saved.savedAt,
      finished: state.phase === 'final',
    })
  }
  for (const key of listKeys(keys.guest(''))) {
    const saved = fresh(load<Saved<GuestIdentity>>(key), now)
    if (!saved || saved.value.removed) continue
    rooms.push({
      roomCode: key.slice(keys.guest('').length),
      role: 'guest',
      name: saved.value.name,
      savedAt: saved.savedAt,
      finished: false,
    })
  }
  return rooms.sort((a, b) => b.savedAt - a.savedAt)
}

/** Removes expired or unreadable room entries. Run once at startup. */
export function pruneSavedRooms(now = Date.now()) {
  for (const key of [...listKeys(keys.hostGame('')), ...listKeys(keys.guest(''))]) {
    if (!fresh(load<Saved<unknown>>(key), now)) remove(key)
  }
}

function fresh<T>(saved: Saved<T> | undefined, now = Date.now()): Saved<T> | undefined {
  return saved &&
    typeof saved.savedAt === 'number' &&
    now - saved.savedAt < ROOM_TTL_MS &&
    saved.value
    ? saved
    : undefined
}
