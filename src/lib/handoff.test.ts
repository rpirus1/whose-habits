import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/game/engine'
import { HANDOFF_TTL_MS, handoffUrl, receiveHandoff, savedRole } from './handoff'
import {
  loadGuestIdentity,
  loadHostGame,
  markMovedToBrowser,
  movedToBrowser,
  saveGuestIdentity,
  saveHostGame,
} from './savedRooms'

/** Minimal in-memory localStorage for the Node test environment. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
  }
}

const ROOM = 'bcdf-ghjk-mnpq'
const game = () =>
  createGame({
    roomCode: ROOM,
    hostId: 'h',
    hostName: 'Ruslan',
    settings: { cultures: ['PL', 'NL'], rounds: 10, seconds: 20 },
  })

/** What public/continue.js does with the URL: park the payload for the room screen. */
function arrive(url: string) {
  const d = new URL(url).searchParams.get('d')!
  localStorage.setItem('cc:handoff', JSON.stringify(d))
}

describe('handoff', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.useFakeTimers({ now: 1_000_000_000 })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('puts the room and the payload in the continue page URL', () => {
    const url = new URL(handoffUrl('https://www.whosehabits.com', ROOM, { host: game() }))
    expect(url.pathname).toBe('/continue.html')
    expect(url.searchParams.get('r')).toBe(ROOM)
    expect(url.searchParams.get('d')).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('makes the receiving browser the host, once', () => {
    arrive(handoffUrl('https://x.test', ROOM, { host: game() }))
    expect(receiveHandoff(ROOM)).toBe('host')
    expect(loadHostGame(ROOM)?.hostId).toBe('h')
    expect(receiveHandoff(ROOM)).toBeNull() // used up
  })

  it('makes it the same guest, with names in any script', () => {
    const guest = { playerId: 'p1', name: 'Ołeksandr 🇺🇦', hostId: 'h' }
    arrive(handoffUrl('https://x.test', ROOM, { guest }))
    expect(receiveHandoff(ROOM)).toBe('guest')
    expect(loadGuestIdentity(ROOM)).toEqual(guest)
  })

  it('ignores an expired payload, another room, or junk', () => {
    arrive(handoffUrl('https://x.test', ROOM, { host: game() }))
    vi.advanceTimersByTime(HANDOFF_TTL_MS + 1)
    expect(receiveHandoff(ROOM)).toBeNull()

    arrive(handoffUrl('https://x.test', ROOM, { host: game() }))
    expect(receiveHandoff('zzzz-zzzz-zzzz')).toBeNull()

    localStorage.setItem('cc:handoff', JSON.stringify('not base64 json'))
    expect(receiveHandoff(ROOM)).toBeNull()
    expect(loadHostGame(ROOM)).toBeUndefined()
  })

  it("never overwrites another browser's room, but the host replaces a stray guest", () => {
    saveGuestIdentity(ROOM, { playerId: 'p1', name: 'Ann' })
    arrive(handoffUrl('https://x.test', ROOM, { guest: { playerId: 'p2', name: 'Bob' } }))
    expect(receiveHandoff(ROOM)).toBeNull()
    expect(loadGuestIdentity(ROOM)?.name).toBe('Ann')

    // This phone opened the plain link in its browser earlier, as a guest.
    arrive(handoffUrl('https://x.test', ROOM, { host: game() }))
    expect(receiveHandoff(ROOM)).toBe('host')
    expect(loadGuestIdentity(ROOM)).toBeUndefined()
  })

  it('carries on in the sending browser when the app loaded the page there instead', () => {
    saveHostGame(game())
    markMovedToBrowser(ROOM)
    arrive(handoffUrl('https://x.test', ROOM, savedRole(ROOM)!))
    expect(receiveHandoff(ROOM)).toBe('host')
    expect(movedToBrowser(ROOM)).toBe(false)
  })
})
