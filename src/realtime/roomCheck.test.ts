import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus } from './connection'
import {
  GIVE_UP_AFTER_MS,
  MISSING_AFTER_MS,
  watchRoom,
  type Listenable,
  type RoomCheck,
} from './roomCheck'

/** A stand-in for RoomConnection that the test drives by hand. */
function fakeConnection() {
  const status = new Set<(s: ConnectionStatus) => void>()
  const presence = new Set<(ids: string[]) => void>()
  const message = new Set<(p: unknown) => void>()
  const on =
    <T>(set: Set<T>) =>
    (l: T) => {
      set.add(l)
      return () => void set.delete(l)
    }
  const connection: Listenable = {
    hostOnline: false,
    onStatus: on(status),
    onPresence: on(presence),
    onMessage: on(message),
  }
  return {
    connection,
    connect: () => status.forEach((l) => l('connected')),
    host: (online: boolean) => {
      connection.hostOnline = online
      presence.forEach((l) => l(online ? ['host'] : []))
    },
    broadcast: (payload: unknown) => message.forEach((l) => l(payload)),
  }
}

const snapshot = {
  v: 1,
  seq: 1,
  hostId: 'h',
  roomCode: 'bcdf-ghjk-mnpq',
  gameId: 'g',
  phase: 'lobby',
  paused: false,
  settings: { cultures: ['PL', 'NL'], rounds: 10, seconds: 20 },
  players: [
    { id: 'h', name: 'Ruslan', score: 0, connected: true, isHost: true },
    { id: 'a', name: 'Ann', score: 0, connected: true, isHost: false },
    { id: 'b', name: 'Bob', score: 0, connected: false, isHost: false, left: true },
  ],
  question: null,
  reveal: null,
  viewing: false,
  final: null,
  holdUntil: null,
}

describe('watchRoom', () => {
  let seen: RoomCheck[]
  const last = () => seen.at(-1)
  beforeEach(() => {
    vi.useFakeTimers()
    seen = []
  })
  afterEach(() => vi.useRealTimers())

  it('finds the host by presence, then adds details from its broadcast', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    f.connect()
    expect(last()).toEqual({ status: 'checking' })
    f.host(true)
    expect(last()).toEqual({ status: 'found' })
    f.broadcast({ type: 'state', snapshot })
    expect(last()).toEqual({ status: 'found', hostName: 'Ruslan', players: 2, phase: 'lobby' })
  })

  it('says missing only after the wait, and recovers when the host comes back', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    vi.advanceTimersByTime(MISSING_AFTER_MS * 2) // still connecting: no verdict yet
    expect(last()).toEqual({ status: 'checking' })
    f.connect()
    vi.advanceTimersByTime(MISSING_AFTER_MS - 600)
    expect(last()).toEqual({ status: 'checking' })
    vi.advanceTimersByTime(600)
    expect(last()).toEqual({ status: 'missing' })
    f.host(true)
    expect(last()).toEqual({ status: 'found' })
  })

  it('counts a recent broadcast as found, until it goes stale', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    f.connect()
    f.broadcast({ type: 'state', snapshot })
    expect(last()?.status).toBe('found')
    vi.advanceTimersByTime(13_000)
    expect(last()).toEqual({ status: 'missing' })
  })

  it('ignores guest messages and junk on the channel', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    f.connect()
    f.broadcast({ type: 'hello', playerId: 'x', name: 'Eve' })
    f.broadcast({ type: 'state', snapshot: { players: 'all' } })
    vi.advanceTimersByTime(MISSING_AFTER_MS)
    expect(last()).toEqual({ status: 'missing' })
  })

  it('gives up after 10 minutes of no game, and stops listening', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    f.connect()
    vi.advanceTimersByTime(MISSING_AFTER_MS)
    expect(last()).toEqual({ status: 'missing' })
    vi.advanceTimersByTime(GIVE_UP_AFTER_MS - 1000)
    expect(last()).toEqual({ status: 'missing' })
    vi.advanceTimersByTime(1000)
    expect(last()).toEqual({ status: 'missing', stopped: true })
    const count = seen.length
    f.host(true)
    vi.advanceTimersByTime(5000)
    expect(seen).toHaveLength(count)
  })

  it('restarts the 10 minutes when the host shows up in between', () => {
    const f = fakeConnection()
    watchRoom(f.connection, (c) => seen.push(c))
    f.connect()
    vi.advanceTimersByTime(GIVE_UP_AFTER_MS - 1000)
    f.host(true)
    f.host(false)
    vi.advanceTimersByTime(MISSING_AFTER_MS + 2000)
    expect(last()).toEqual({ status: 'missing' })
  })

  it('stops listening when stopped', () => {
    const f = fakeConnection()
    const stop = watchRoom(f.connection, (c) => seen.push(c))
    stop()
    f.connect()
    f.host(true)
    expect(seen).toEqual([])
  })
})
