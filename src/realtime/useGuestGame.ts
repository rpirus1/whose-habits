// A guest's side of a room: says hello until the host lists them, syncs its clock,
// sends answers until the host acknowledges them, and renders snapshots.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuestMessage, HostMessage, Snapshot } from '@/game/protocol'
import type { Choice } from '@/game/types'
import { keys, load, save } from '@/lib/storage'
import { CLOCK_SAMPLE_GAP_MS, CLOCK_SAMPLES, estimateOffset } from './clock'
import type { ClockSample } from './clock'
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

export interface MyAnswer {
  roundId: string
  choice: Choice
  /** The host confirmed it has this choice. */
  acked: boolean
}

const HELLO_RETRY_MS = 2000
const ANSWER_RETRY_MS = 1000
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
  /** Host clock minus our clock; 0 until measured. */
  const [clockOffset, setClockOffset] = useState(0)
  const [myAnswer, setMyAnswer] = useState<MyAnswer | null>(null)

  const connectionRef = useRef<RoomConnection | null>(null)
  const myAnswerRef = useRef<MyAnswer | null>(null)
  const lastSeq = useRef(0)
  const hostId = useRef(identity.hostId)

  const send = useCallback((message: GuestMessage) => connectionRef.current?.send(message), [])

  const updateMyAnswer = (answer: MyAnswer | null) => {
    myAnswerRef.current = answer
    setMyAnswer(answer)
  }

  const answer = useCallback(
    (roundId: string, choice: Choice) => {
      updateMyAnswer({ roundId, choice, acked: false })
      send({ type: 'answer', playerId: identity.playerId, roundId, choice })
    },
    [identity.playerId, send],
  )

  useEffect(() => {
    const { connection, release } = acquireRoom(roomCode, identity.playerId)
    connectionRef.current = connection
    connection.track({ role: 'guest', name: identity.name })

    let listed = false
    let finalStatus = false
    let currentRoundId: string | undefined
    const samples: ClockSample[] = []
    const timers: number[] = []

    const hello = () => {
      if (!listed && !finalStatus && connection.status === 'connected') {
        connection.send({ type: 'hello', playerId: identity.playerId, name: identity.name })
      }
    }

    const syncClock = () => {
      samples.length = 0
      for (let i = 0; i < CLOCK_SAMPLES; i++) {
        timers.push(
          window.setTimeout(
            () => connection.send({ type: 'ping', playerId: identity.playerId, t0: Date.now() }),
            i * CLOCK_SAMPLE_GAP_MS,
          ),
        )
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
      switch (message?.type) {
        case 'state': {
          const snap = message.snapshot
          if (hostId.current && snap.hostId !== hostId.current) return
          if (snap.seq <= lastSeq.current) return
          lastSeq.current = snap.seq
          if (!hostId.current) {
            hostId.current = snap.hostId
            saveGuestIdentity(roomCode, { ...identity, hostId: snap.hostId })
          }
          const wasListed = listed
          listed = snap.players.some((p) => p.id === identity.playerId)
          if (listed && !wasListed) syncClock()
          currentRoundId = snap.question?.roundId
          setSnapshot(snap)
          if (listed) setStatus('in')
          return
        }
        case 'rejected':
          if (message.playerId !== identity.playerId) return
          finalStatus = true
          setStatus(message.reason)
          return
        case 'pong': {
          if (message.playerId !== identity.playerId) return
          samples.push({ t0: message.t0, hostNow: message.hostNow, t1: Date.now() })
          const offset = estimateOffset(samples)
          if (offset !== null) setClockOffset(offset)
          return
        }
        case 'ack': {
          const mine = myAnswerRef.current
          if (
            message.playerId === identity.playerId &&
            mine &&
            mine.roundId === message.roundId &&
            mine.choice === message.choice
          ) {
            updateMyAnswer({ ...mine, acked: true })
          }
          return
        }
      }
    })

    const retryHello = window.setInterval(hello, HELLO_RETRY_MS)
    // Broadcast can drop a message on a flaky connection: re-send until the host confirms.
    const retryAnswer = window.setInterval(() => {
      const mine = myAnswerRef.current
      if (mine && !mine.acked && mine.roundId === currentRoundId) {
        connection.send({
          type: 'answer',
          playerId: identity.playerId,
          roundId: mine.roundId,
          choice: mine.choice,
        })
      }
    }, ANSWER_RETRY_MS)
    const notFound = window.setTimeout(
      () => setStatus((prev) => (prev === 'joining' || prev === 'connecting' ? 'notFound' : prev)),
      NOT_FOUND_AFTER_MS,
    )

    return () => {
      offStatus()
      offPresence()
      offMessage()
      clearInterval(retryHello)
      clearInterval(retryAnswer)
      clearTimeout(notFound)
      timers.forEach(clearTimeout)
      connectionRef.current = null
      release()
    }
  }, [roomCode, identity])

  // Until the first presence sync arrives (the list includes ourselves), assume the host is there.
  const hostOnline = !snapshot || !onlineIds.length || onlineIds.includes(snapshot.hostId)

  return { snapshot, status, hostOnline, clockOffset, myAnswer, answer }
}
