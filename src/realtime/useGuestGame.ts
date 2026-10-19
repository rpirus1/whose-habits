// A guest's side of a room: says hello until the host lists them, then renders snapshots.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuestMessage, HostMessage, Snapshot } from '@/game/protocol'
import { keys, load, save } from '@/lib/storage'
import { acquireRoom } from './connection'
import type { RoomConnection } from './connection'

export interface GuestIdentity {
  playerId: string
  name: string
  /** The host this guest first heard from; snapshots from anyone else are ignored. */
  hostId?: string
}

export type GuestStatus =
  | 'connecting'
  /** Connected, no answer from a host yet. */
  | 'joining'
  | 'in'
  /** No host answered for a while: wrong code, or the host is gone. Keeps trying. */
  | 'notFound'
  | 'full'
  | 'kicked'

const HELLO_RETRY_MS = 2000
const NOT_FOUND_AFTER_MS = 8000

export function loadGuestIdentity(roomCode: string) {
  return load<GuestIdentity>(keys.guest(roomCode))
}

export function saveGuestIdentity(roomCode: string, identity: GuestIdentity) {
  save(keys.guest(roomCode), identity)
}

export function useGuestGame(roomCode: string, identity: GuestIdentity) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState<GuestStatus>('connecting')
  const [onlineIds, setOnlineIds] = useState<string[]>([])
  const connectionRef = useRef<RoomConnection | null>(null)
  const lastSeq = useRef(0)
  const hostId = useRef(identity.hostId)

  const send = useCallback((message: GuestMessage) => connectionRef.current?.send(message), [])

  useEffect(() => {
    const { connection, release } = acquireRoom(roomCode, identity.playerId)
    connectionRef.current = connection
    connection.track({ role: 'guest', name: identity.name })

    let listed = false
    let finalStatus = false
    const hello = () => {
      if (!listed && !finalStatus && connection.status === 'connected') {
        connection.send({ type: 'hello', playerId: identity.playerId, name: identity.name })
      }
    }

    const offStatus = connection.onStatus((s) => {
      if (s === 'connected') {
        setStatus((prev) => (prev === 'connecting' ? 'joining' : prev))
        hello()
      }
    })

    const offPresence = connection.onPresence(setOnlineIds)

    const offMessage = connection.onMessage((payload) => {
      const message = payload as HostMessage
      if (message?.type === 'state') {
        const snap = message.snapshot
        if (hostId.current && snap.hostId !== hostId.current) return
        if (snap.seq <= lastSeq.current) return
        lastSeq.current = snap.seq
        if (!hostId.current) {
          hostId.current = snap.hostId
          saveGuestIdentity(roomCode, { ...identity, hostId: snap.hostId })
        }
        listed = snap.players.some((p) => p.id === identity.playerId)
        setSnapshot(snap)
        if (listed) setStatus('in')
      } else if (message?.type === 'rejected' && message.playerId === identity.playerId) {
        finalStatus = true
        setStatus(message.reason)
      }
    })

    const retry = window.setInterval(hello, HELLO_RETRY_MS)
    const notFound = window.setTimeout(
      () => setStatus((prev) => (prev === 'joining' || prev === 'connecting' ? 'notFound' : prev)),
      NOT_FOUND_AFTER_MS,
    )

    return () => {
      offStatus()
      offPresence()
      offMessage()
      clearInterval(retry)
      clearTimeout(notFound)
      connectionRef.current = null
      release()
    }
  }, [roomCode, identity])

  // Until the first presence sync arrives (the list includes ourselves), assume the host is there.
  const hostOnline = !snapshot || !onlineIds.length || onlineIds.includes(snapshot.hostId)

  return { snapshot, status, hostOnline, send }
}
