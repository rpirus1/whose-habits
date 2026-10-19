// The host's side of a room: runs the engine, answers guests, broadcasts snapshots,
// and saves the full game state so a refresh rejoins the same room.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STATEMENT_MAP } from '@/content/statements'
import { joinRejection, reduce } from '@/game/engine'
import type { Action } from '@/game/engine'
import { parseGuestMessage, toSnapshot } from '@/game/protocol'
import type { HostMessage, Snapshot } from '@/game/protocol'
import type { EngineContext, GameState } from '@/game/types'
import { keys, load, save } from '@/lib/storage'
import { acquireRoom } from './connection'
import type { ConnectionStatus, RoomConnection } from './connection'

/** Re-send the snapshot this often even without changes, so nobody stays out of sync. */
const HEARTBEAT_MS = 5000
/** How often the host checks the timer. */
const TICK_MS = 250
const RECENT_LIMIT = 150

const context = (): EngineContext => ({
  now: Date.now(),
  statements: STATEMENT_MAP,
  random: Math.random,
})

export function loadHostGame(roomCode: string): GameState | undefined {
  const state = load<GameState>(keys.hostGame(roomCode))
  return state?.v === 1 ? state : undefined
}

export function saveHostGame(state: GameState) {
  save(keys.hostGame(state.roomCode), state)
}

export interface HostGame {
  state: GameState
  snapshot: Snapshot
  status: ConnectionStatus
  dispatch: (action: Action) => void
}

export function useHostGame(initial: GameState): HostGame {
  const [state, setState] = useState(initial)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const stateRef = useRef(initial)
  const connectionRef = useRef<RoomConnection | null>(null)
  const seqRef = useRef(0)

  const broadcast = useCallback((s: GameState) => {
    // Time-based so snapshots stay ordered across a host refresh.
    seqRef.current = Math.max(seqRef.current + 1, Date.now())
    const message: HostMessage = {
      type: 'state',
      snapshot: toSnapshot(s, STATEMENT_MAP, seqRef.current),
    }
    connectionRef.current?.send(message)
  }, [])

  const dispatch = useCallback(
    (action: Action) => {
      const next = reduce(stateRef.current, action, context())
      if (next === stateRef.current) return
      stateRef.current = next
      setState(next)
      saveHostGame(next)
      broadcast(next)
    },
    [broadcast],
  )

  useEffect(() => {
    const { connection, release } = acquireRoom(initial.roomCode, initial.hostId)
    connectionRef.current = connection
    connection.track({ role: 'host' })

    const offStatus = connection.onStatus((s) => {
      setStatus(s)
      if (s === 'connected') broadcast(stateRef.current)
    })

    const offPresence = connection.onPresence((onlineIds) =>
      dispatch({ type: 'presence', onlineIds }),
    )

    const offMessage = connection.onMessage((payload) => {
      const message = parseGuestMessage(payload)
      if (!message) return
      switch (message.type) {
        case 'hello': {
          const reason = joinRejection(stateRef.current, message.playerId)
          if (reason) {
            connection.send({
              type: 'rejected',
              playerId: message.playerId,
              reason,
            } satisfies HostMessage)
            return
          }
          const before = stateRef.current
          dispatch({ type: 'join', playerId: message.playerId, name: message.name })
          // Already in the room and nothing changed: they still need the current snapshot.
          if (stateRef.current === before) broadcast(before)
          return
        }
        case 'answer': {
          dispatch(message)
          // Ack whenever the host holds this choice, including re-sends it already had.
          const round = stateRef.current.rounds.at(-1)
          if (
            round?.id === message.roundId &&
            round.answers[message.playerId]?.choice === message.choice
          ) {
            connection.send({
              type: 'ack',
              playerId: message.playerId,
              roundId: message.roundId,
              choice: message.choice,
            } satisfies HostMessage)
          }
          return
        }
        case 'ping':
          connection.send({
            type: 'pong',
            playerId: message.playerId,
            t0: message.t0,
            hostNow: Date.now(),
          } satisfies HostMessage)
          return
      }
    })

    const tick = window.setInterval(() => dispatch({ type: 'tick' }), TICK_MS)
    const heartbeat = window.setInterval(() => broadcast(stateRef.current), HEARTBEAT_MS)

    return () => {
      offStatus()
      offPresence()
      offMessage()
      clearInterval(tick)
      clearInterval(heartbeat)
      connectionRef.current = null
      release()
    }
  }, [initial.roomCode, initial.hostId, broadcast, dispatch])

  // Remember statements this device has shown, so the next game avoids them.
  useEffect(() => {
    if (!state.shownIds.length) return
    const recent = load<string[]>(keys.recentStatements) ?? []
    const merged = [...new Set([...state.shownIds, ...recent])].slice(0, RECENT_LIMIT)
    save(keys.recentStatements, merged)
  }, [state.shownIds])

  // The host renders the same snapshot guests get; seq only matters on the wire.
  const snapshot = useMemo(() => toSnapshot(state, STATEMENT_MAP, 0), [state])
  return { state, snapshot, status, dispatch }
}

export function recentStatementIds(): string[] {
  return load<string[]>(keys.recentStatements) ?? []
}
