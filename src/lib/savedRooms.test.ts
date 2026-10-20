import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from '@/game/engine'
import {
  lastRoom,
  listSavedRooms,
  loadGuestIdentity,
  loadHostGame,
  markGuestRemoved,
  pruneSavedRooms,
  ROOM_TTL_MS,
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

const settings = { cultures: ['PL', 'NL'] as const, rounds: 10, seconds: 20 } as const
const game = (roomCode: string) =>
  createGame({
    roomCode,
    hostId: 'h',
    hostName: 'Alex',
    settings: { ...settings, cultures: [...settings.cultures] },
  })

describe('saved rooms', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.useFakeTimers({ now: 1_000_000_000 })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('round-trips host games and guest identities', () => {
    saveHostGame(game('BCDF'))
    saveGuestIdentity('GHJK', { playerId: 'p1', name: 'Anna' })
    expect(loadHostGame('BCDF')?.roomCode).toBe('BCDF')
    expect(loadGuestIdentity('GHJK')).toEqual({ playerId: 'p1', name: 'Anna' })
    expect(loadHostGame('GHJK')).toBeUndefined()
  })

  it('lists rooms newest first with role and name', () => {
    saveHostGame(game('BCDF'))
    vi.advanceTimersByTime(1000)
    saveGuestIdentity('GHJK', { playerId: 'p1', name: 'Anna' })
    expect(listSavedRooms().map((r) => [r.roomCode, r.role, r.name])).toEqual([
      ['GHJK', 'guest', 'Anna'],
      ['BCDF', 'host', 'Alex'],
    ])
  })

  it('offers a room you left, but not one you were kicked from or turned away by', () => {
    saveGuestIdentity('BCDF', { playerId: 'p1', name: 'Anna', removed: 'left' })
    saveGuestIdentity('GHJK', { playerId: 'p1', name: 'Anna', removed: 'kicked' })
    saveGuestIdentity('MNPQ', { playerId: 'p1', name: 'Anna', removed: 'full' })
    expect(listSavedRooms().map((r) => r.roomCode)).toEqual(['BCDF'])
  })

  it('offers only the newest room as the last game, never an older one', () => {
    saveGuestIdentity('BCDF', { playerId: 'p1', name: 'Anna' })
    vi.advanceTimersByTime(1000)
    saveGuestIdentity('GHJK', { playerId: 'p2', name: 'Anna' })
    vi.advanceTimersByTime(1000)
    markGuestRemoved('GHJK', 'left')
    expect(lastRoom()?.roomCode).toBe('GHJK')

    vi.advanceTimersByTime(1000)
    markGuestRemoved('GHJK', 'kicked')
    expect(lastRoom()).toBeUndefined()

    vi.advanceTimersByTime(1000)
    saveHostGame({ ...game('MNPQ'), phase: 'final' })
    expect(lastRoom()).toBeUndefined()
  })

  it('treats entries older than the TTL as gone and prunes them', () => {
    saveHostGame(game('BCDF'))
    vi.advanceTimersByTime(ROOM_TTL_MS - 1)
    saveGuestIdentity('GHJK', { playerId: 'p1', name: 'Anna' })
    vi.advanceTimersByTime(2)
    expect(loadHostGame('BCDF')).toBeUndefined()
    expect(loadGuestIdentity('GHJK')).toBeDefined()
    pruneSavedRooms()
    expect(localStorage.length).toBe(1)
  })

  it('drops entries in an old or broken format', () => {
    localStorage.setItem('cc:host:BCDF', JSON.stringify(game('BCDF'))) // pre-expiry format
    localStorage.setItem('cc:guest:GHJK', '{not json')
    localStorage.setItem('cc:lastName', '"Alex"')
    pruneSavedRooms()
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem('cc:lastName')).toBe('"Alex"')
  })
})
