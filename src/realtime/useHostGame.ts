// The host's side of a room: runs the engine, answers guests, broadcasts snapshots,
// and saves the full game state so a refresh rejoins the same room.
// The game's statements come from the Worker (/api/deck): dealt while the lobby is open, kept
// in the state as `deck` from Start.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Statement } from '@/content/schema'
import { countriesOf, joinRejection, reduce } from '@/game/engine'
import type { Action } from '@/game/engine'
import { statementEvents } from '@/game/metrics'
import { parseGuestMessage, toSnapshot } from '@/game/protocol'
import type { HostMessage, Snapshot } from '@/game/protocol'
import { isRandom } from '@/game/types'
import type { EngineContext, GameState } from '@/game/types'
import { trackOnce } from '@/lib/analytics'
import { fetchDeck } from '@/lib/deck'
import { newId } from '@/lib/id'
import { saveHostGame } from '@/lib/savedRooms'
import { keys, load, save } from '@/lib/storage'
import { acquireRoom } from './connection'
import type { ConnectionStatus, RoomConnection } from './connection'

/** Re-send the snapshot this often even without changes, so nobody stays out of sync. */
const HEARTBEAT_MS = 5000
/** How often the host checks the timer. */
const TICK_MS = 250
const RECENT_LIMIT = 150
/** Settings can change in the lobby: deal once they settle. */
const DEAL_DELAY_MS = 300

const NO_STATEMENTS: ReadonlyMap<string, Statement> = new Map()
const lookups = new WeakMap<Statement[], ReadonlyMap<string, Statement>>()

/** The engine's and the snapshots' statement lookup: the game's deck. */
function statementsOf(deck: Statement[] | undefined): ReadonlyMap<string, Statement> {
  if (!deck) return NO_STATEMENTS
  let map = lookups.get(deck)
  if (!map) {
    map = new Map(deck.map((s) => [s.id, s]))
    lookups.set(deck, map)
  }
  return map
}

const context = (statements: ReadonlyMap<string, Statement>): EngineContext => ({
  now: Date.now(),
  statements,
  random: Math.random,
})

/** A deck for the game these settings make, avoiding what this device played recently. */
function requestDeck(s: GameState): Promise<Statement[]> {
  return fetchDeck({
    countries: countriesOf(s.settings),
    rounds: s.settings.rounds,
    recentIds: [...new Set([...s.shownIds, ...recentStatementIds()])].slice(0, RECENT_LIMIT),
  })
}

export interface HostGame {
  state: GameState
  snapshot: Snapshot
  status: ConnectionStatus
  dispatch: (action: Action) => void
  /** Gets the deck (usually dealt already) and starts the game. Rejects when it can't. */
  start: () => Promise<void>
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
      snapshot: toSnapshot(s, statementsOf(s.deck), seqRef.current),
    }
    connectionRef.current?.send(message)
  }, [])

  const dispatch = useCallback(
    /** `deck`: Start's statements; other actions use the game's own. */
    (action: Action, deck?: Statement[]) => {
      const statements = statementsOf(deck ?? stateRef.current.deck)
      const next = reduce(stateRef.current, action, context(statements))
      if (next === stateRef.current) return
      stateRef.current = next
      setState(next)
      saveHostGame(next)
      broadcast(next)
      // Tell a removed player directly, so their screen changes at once.
      if (action.type === 'kick') {
        connectionRef.current?.send({
          type: 'rejected',
          playerId: action.playerId,
          reason: 'kicked',
        } satisfies HostMessage)
      }
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
        case 'leave':
        case 'reportOpen':
        case 'reportDone':
          dispatch(message)
          return
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
    // Phones throttle timers in the background (e.g. while the host shares the link in a
    // chat app). On return, close any expired round right away and re-send the state.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      dispatch({ type: 'tick' })
      broadcast(stateRef.current)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      offStatus()
      offPresence()
      offMessage()
      clearInterval(tick)
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisible)
      connectionRef.current = null
      release()
    }
  }, [initial.roomCode, initial.hostId, broadcast, dispatch])

  // Game-level metrics, sent once per game from the host's device.
  useEffect(() => {
    const { gameId, phase } = state
    if (!gameId || phase === 'lobby') return
    trackOnce(`started:${gameId}`, {
      type: 'game_started',
      gameId,
      players: state.playersAtStart ?? 0,
      mode: isRandom(state.settings) ? 'random' : 'pick',
      cultures: isRandom(state.settings) ? [] : state.settings.cultures,
      rounds: state.totalRounds,
      seconds: state.settings.seconds,
      replay: state.replay === true,
      source: state.source ?? 'direct',
    })
    if (phase === 'final') {
      trackOnce(`finished:${gameId}`, {
        type: 'game_finished',
        gameId,
        roundsPlayed: state.rounds.length,
        totalRounds: state.totalRounds,
        playersAtStart: state.playersAtStart ?? 0,
        playersAtEnd: state.players.filter((p) => p.connected).length,
        endedEarly: state.rounds.length < state.totalRounds,
      })
    }
  }, [state])

  // Statement metrics: each played round, each replaced statement, and each report once its
  // hold ends (so a reporter who drops still counts). Keys stay here; events have no player ids.
  useEffect(() => {
    for (const { key, event } of statementEvents(state, statementsOf(state.deck)))
      trackOnce(key, event)
  }, [state])

  // Remember statements this device has shown, so the next game avoids them.
  useEffect(() => {
    if (!state.shownIds.length) return
    const recent = load<string[]>(keys.recentStatements) ?? []
    const merged = [...new Set([...state.shownIds, ...recent])].slice(0, RECENT_LIMIT)
    save(keys.recentStatements, merged)
  }, [state.shownIds])

  // Deal the next game's deck while the lobby is open, so Start doesn't wait for the network.
  // A settings change deals again; a failed deal is retried by Start.
  const nextDeck = useRef<Promise<Statement[]> | null>(null)
  const dealKey =
    state.phase === 'lobby'
      ? JSON.stringify([countriesOf(state.settings), state.settings.rounds])
      : null
  useEffect(() => {
    if (!dealKey) return
    const timer = window.setTimeout(() => {
      const deal = requestDeck(stateRef.current)
      nextDeck.current = deal
      deal.catch(() => {
        if (nextDeck.current === deal) nextDeck.current = null
      })
    }, DEAL_DELAY_MS)
    return () => {
      clearTimeout(timer)
      nextDeck.current = null
    }
  }, [dealKey])

  const start = useCallback(async () => {
    const deal = nextDeck.current ?? requestDeck(stateRef.current)
    nextDeck.current = null
    const deck = await deal
    dispatch({ type: 'start', gameId: newId(), recentIds: recentStatementIds() }, deck)
  }, [dispatch])

  // The host renders the same snapshot guests get; seq only matters on the wire.
  const snapshot = useMemo(() => toSnapshot(state, statementsOf(state.deck), 0), [state])
  return { state, snapshot, status, dispatch, start }
}

export function recentStatementIds(): string[] {
  return load<string[]>(keys.recentStatements) ?? []
}
