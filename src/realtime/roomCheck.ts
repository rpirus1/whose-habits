// Before a new guest joins: is anyone hosting this room right now? There's no server list of
// rooms. The host's phone is in the room's presence as { role: 'host' } and broadcasts the game
// every few seconds, so listening for a moment answers it. A locked host phone drops out too,
// so "missing" means "not running right now", and the check keeps listening in case it's back.
import { parseHostMessage } from '@/game/protocol'
import type { Phase } from '@/game/types'
import type { ConnectionStatus } from './connection'

export type RoomCheck =
  | { status: 'checking' }
  /** Details come from the host's last broadcast; presence alone has none. */
  | { status: 'found'; hostName?: string; players?: number; phase?: Phase }
  | { status: 'missing' }

/** After connecting: long enough for presence to sync, short enough to feel like an answer. */
export const MISSING_AFTER_MS = 4000
/** A broadcast counts as "the host is there" for two heartbeats (the host sends one every 5 s). */
const BROADCAST_FRESH_MS = 12_000

/** The parts of RoomConnection the check needs (a fake one in tests). */
export interface Listenable {
  hostOnline: boolean
  onStatus(listener: (status: ConnectionStatus) => void): () => void
  onPresence(listener: (ids: string[]) => void): () => void
  onMessage(listener: (payload: unknown) => void): () => void
}

/** Calls onChange whenever the answer changes. Returns a function that stops watching. */
export function watchRoom(connection: Listenable, onChange: (check: RoomCheck) => void) {
  let connectedAt: number | null = null
  let lastBroadcast: {
    at: number
    details: Omit<Extract<RoomCheck, { status: 'found' }>, 'status'>
  } | null = null
  let last = ''

  const evaluate = () => {
    const now = Date.now()
    const fresh =
      lastBroadcast && now - lastBroadcast.at < BROADCAST_FRESH_MS ? lastBroadcast : null
    const check: RoomCheck =
      connection.hostOnline || fresh
        ? { status: 'found', ...lastBroadcast?.details }
        : connectedAt !== null && now - connectedAt >= MISSING_AFTER_MS
          ? { status: 'missing' }
          : { status: 'checking' }
    const key = JSON.stringify(check)
    if (key !== last) {
      last = key
      onChange(check)
    }
  }

  const offStatus = connection.onStatus((status) => {
    if (status === 'connected' && connectedAt === null) connectedAt = Date.now()
    evaluate()
  })
  const offPresence = connection.onPresence(evaluate)
  const offMessage = connection.onMessage((payload) => {
    const message = parseHostMessage(payload)
    if (message?.type !== 'state') return
    const { players, phase } = message.snapshot
    lastBroadcast = {
      at: Date.now(),
      details: {
        hostName: players.find((p) => p.isHost)?.name,
        players: players.filter((p) => !p.left).length,
        phase,
      },
    }
    evaluate()
  })
  // Time alone changes the answer (the wait runs out, a broadcast goes stale).
  const tick = setInterval(evaluate, 500)

  return () => {
    offStatus()
    offPresence()
    offMessage()
    clearInterval(tick)
  }
}
