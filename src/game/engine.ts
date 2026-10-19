// The game state machine. Runs only on the host's device; guests render snapshots.
// Pure: (state, action, context) → state. Time and randomness come from the context.
//
//   lobby ──start──▶ question ⇄ pause/resume
//                       │ timer ends / everyone answered
//                       ▼
//   final ◀──last── reveal ──next──▶ question      (back: view earlier reveals)
//   question ──skip / everyone "I don't know"──▶ question (replacement, same index)
//   any ──end──▶ final ──playAgain──▶ lobby
import { CULTURE_CODES } from '@/content/schema'
import type { CultureCode } from '@/content/schema'
import { MAX_CULTURES, MIN_CULTURES } from '@/content/cultures'
import { scoreRound } from './scoring'
import { eligibleStatements, pickReplacement, planGame } from './selection'
import {
  ANSWER_GRACE_MS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  ROUND_OPTIONS,
  SECONDS_OPTIONS,
} from './types'
import type { GameSource } from '@/lib/events'
import type { Choice, EngineContext, GameState, Player, Round, Settings } from './types'

export type Action =
  | { type: 'join'; playerId: string; name: string }
  | { type: 'presence'; onlineIds: string[] }
  | { type: 'answer'; playerId: string; roundId: string; choice: Choice }
  | { type: 'start'; gameId: string; recentIds?: string[] }
  | { type: 'tick' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'end' }
  | { type: 'kick'; playerId: string }
  | { type: 'updateSettings'; settings: Settings }
  | { type: 'playAgain'; gameId: string }

export const DEFAULT_HOST_NAME = 'Host'
export const DEFAULT_PLAYER_NAME = 'Player'

export function createGame(input: {
  roomCode: string
  hostId: string
  hostName?: string
  settings: Settings
  source?: GameSource
}): GameState {
  return {
    v: 1,
    ...(input.source && { source: input.source }),
    roomCode: input.roomCode,
    hostId: input.hostId,
    gameId: '',
    phase: 'lobby',
    settings: input.settings,
    players: [
      {
        id: input.hostId,
        name: cleanName(input.hostName ?? '') || DEFAULT_HOST_NAME,
        score: 0,
        connected: true,
        isHost: true,
        playsFrom: 0,
      },
    ],
    kickedIds: [],
    totalRounds: 0,
    playersAtStart: 0,
    queue: [],
    shownIds: [],
    rounds: [],
    endsAt: null,
    paused: false,
    remainingMs: null,
    viewing: null,
    pausedByBack: false,
  }
}

/** Why a guest can't join, or null. The host sends this back as a `rejected` message. */
export function joinRejection(state: GameState, playerId: string): 'kicked' | 'full' | null {
  if (state.kickedIds.includes(playerId)) return 'kicked'
  if (state.players.some((p) => p.id === playerId)) return null
  return state.players.length >= MAX_PLAYERS ? 'full' : null
}

export function currentRound(state: GameState): Round | undefined {
  return state.phase === 'question' || state.phase === 'reveal' ? state.rounds.at(-1) : undefined
}

/** Players expected to answer this round: connected and not waiting as late joiners. */
export function answeringPlayers(state: GameState, round: Round): Player[] {
  return state.players.filter((p) => p.connected && p.playsFrom <= round.index)
}

export function canStart(state: GameState): boolean {
  return (
    state.phase === 'lobby' &&
    state.players.filter((p) => p.connected).length >= MIN_PLAYERS_TO_START
  )
}

export function validSettings(settings: Settings): boolean {
  const unique = new Set(settings.cultures)
  return (
    unique.size === settings.cultures.length &&
    unique.size >= MIN_CULTURES &&
    unique.size <= MAX_CULTURES &&
    settings.cultures.every((c) => (CULTURE_CODES as readonly string[]).includes(c)) &&
    (ROUND_OPTIONS as readonly number[]).includes(settings.rounds) &&
    (SECONDS_OPTIONS as readonly number[]).includes(settings.seconds)
  )
}

export function reduce(state: GameState, action: Action, ctx: EngineContext): GameState {
  const draft = structuredClone(state)
  return apply(draft, action, ctx) ? draft : state
}

/** Mutates the draft; returns false when the action doesn't apply (state stays the same object). */
function apply(s: GameState, action: Action, ctx: EngineContext): boolean {
  switch (action.type) {
    case 'join': {
      if (joinRejection(s, action.playerId)) return false
      const existing = s.players.find((p) => p.id === action.playerId)
      if (existing) {
        // Rejoin after refresh: keep name, score and slot.
        if (existing.connected) return false
        existing.connected = true
        return true
      }
      s.players.push({
        id: action.playerId,
        name: uniqueName(s.players, cleanName(action.name) || DEFAULT_PLAYER_NAME),
        score: 0,
        connected: true,
        isHost: false,
        // Late joiners wait for the next round.
        playsFrom: s.phase === 'question' ? s.rounds.at(-1)!.index + 1 : s.rounds.length,
      })
      return true
    }

    case 'presence': {
      let changed = false
      for (const p of s.players) {
        const connected = p.isHost || action.onlineIds.includes(p.id)
        if (p.connected !== connected) {
          p.connected = connected
          changed = true
        }
      }
      return closeIfEveryoneAnswered(s, ctx) || changed
    }

    case 'answer': {
      const round = currentRound(s)
      const player = s.players.find((p) => p.id === action.playerId)
      if (
        s.phase !== 'question' ||
        s.paused ||
        !round ||
        round.id !== action.roundId ||
        !player ||
        player.playsFrom > round.index ||
        !validChoice(action.choice, s.settings.cultures) ||
        s.endsAt === null ||
        ctx.now > s.endsAt + ANSWER_GRACE_MS
      )
        return false
      if (round.answers[player.id]?.choice === action.choice) return false
      round.answers[player.id] = { choice: action.choice, at: ctx.now }
      closeIfEveryoneAnswered(s, ctx)
      return true
    }

    case 'start': {
      if (!canStart(s) || !validSettings(s.settings)) return false
      const recent = new Set([...(action.recentIds ?? []), ...s.shownIds])
      const { cultures, rounds } = s.settings
      s.queue = planGame(ctx.statements.values(), cultures, rounds, ctx.random, recent)
      if (!s.queue.length) return false
      s.totalRounds = Math.min(rounds, s.queue.length)
      s.playersAtStart = s.players.filter((p) => p.connected).length
      s.gameId = action.gameId
      s.rounds = []
      for (const p of s.players) {
        p.score = 0
        p.playsFrom = 0
      }
      startQuestion(s, ctx)
      return true
    }

    case 'tick': {
      if (s.phase !== 'question' || s.paused || s.endsAt === null) return false
      if (ctx.now < s.endsAt + ANSWER_GRACE_MS) return false
      closeRound(s)
      return true
    }

    case 'pause': {
      if (s.paused || (s.phase !== 'question' && s.phase !== 'reveal')) return false
      s.paused = true
      if (s.phase === 'question' && s.endsAt !== null) {
        s.remainingMs = Math.max(0, s.endsAt - ctx.now)
        s.endsAt = null
      }
      return true
    }

    case 'resume': {
      if (!s.paused) return false
      resume(s, ctx)
      return true
    }

    case 'back': {
      const round = currentRound(s)
      if (!round) return false
      const target = (s.viewing ?? round.index) - 1
      if (target < 0) return false
      if (s.phase === 'question' && !s.paused) {
        apply(s, { type: 'pause' }, ctx)
        s.pausedByBack = true
      }
      s.viewing = target
      return true
    }

    case 'next': {
      if (s.phase === 'question' && s.viewing !== null) {
        // Back during a live question: Next returns to it (resuming if Back paused it).
        s.viewing = null
        if (s.pausedByBack) resume(s, ctx)
        return true
      }
      if (s.phase !== 'reveal') return false
      // From a reveal (or an earlier reveal via Back): on to the next unplayed statement.
      if (s.rounds.length >= s.totalRounds || !s.queue.length) finish(s)
      else startQuestion(s, ctx)
      return true
    }

    case 'skip': {
      if (s.phase !== 'question' || s.viewing !== null) return false
      replaceStatement(s, ctx)
      return true
    }

    case 'end': {
      if (s.phase !== 'question' && s.phase !== 'reveal') return false
      // An unfinished question doesn't count.
      if (s.phase === 'question') s.rounds.pop()
      finish(s)
      return true
    }

    case 'kick': {
      const player = s.players.find((p) => p.id === action.playerId)
      if (!player || player.isHost) return false
      s.players = s.players.filter((p) => p.id !== player.id)
      s.kickedIds.push(player.id)
      const round = currentRound(s)
      if (round && !round.result) delete round.answers[player.id]
      closeIfEveryoneAnswered(s, ctx)
      return true
    }

    case 'updateSettings': {
      if (s.phase !== 'lobby' || !validSettings(action.settings)) return false
      s.settings = { ...action.settings, cultures: [...action.settings.cultures] }
      return true
    }

    case 'playAgain': {
      if (s.phase !== 'final') return false
      s.phase = 'lobby'
      s.gameId = action.gameId
      s.replay = true
      s.rounds = []
      s.queue = []
      s.totalRounds = 0
      for (const p of s.players) {
        p.score = 0
        p.playsFrom = 0
      }
      return true
    }
  }
}

function startQuestion(s: GameState, ctx: EngineContext) {
  const statementId = s.queue.shift()!
  pushRound(s, statementId, s.rounds.length, ctx)
}

function pushRound(s: GameState, statementId: string, index: number, ctx: EngineContext) {
  const statement = ctx.statements.get(statementId)!
  const [{ answer }] = eligibleStatements([statement], s.settings.cultures)
  s.rounds.push({
    id: `${index}-${statementId}`,
    index,
    statementId,
    answer,
    answers: {},
    result: null,
  })
  s.shownIds.push(statementId)
  s.phase = 'question'
  s.endsAt = ctx.now + s.settings.seconds * 1000
  s.paused = false
  s.remainingMs = null
  s.viewing = null
  s.pausedByBack = false
}

/** Skip or everyone "I don't know": swap in a reserve statement at the same round index. */
function replaceStatement(s: GameState, ctx: EngineContext) {
  const round = s.rounds.at(-1)!
  const roundsLeft = s.totalRounds - (round.index + 1)
  const replaced = ctx.statements.get(round.statementId)!
  const at = pickReplacement(
    s.queue,
    roundsLeft,
    ctx.statements,
    s.settings.cultures,
    replaced,
    round.answer,
  )
  if (at === -1) {
    // Reserve is empty: score the round as it stands.
    closeRound(s)
    return
  }
  const [statementId] = s.queue.splice(at, 1)
  s.rounds.pop()
  pushRound(s, statementId, round.index, ctx)
}

function closeIfEveryoneAnswered(s: GameState, ctx: EngineContext): boolean {
  const round = currentRound(s)
  if (s.phase !== 'question' || s.paused || !round) return false
  const expected = answeringPlayers(s, round)
  if (!expected.length || !expected.every((p) => round.answers[p.id])) return false
  if (expected.every((p) => round.answers[p.id].choice === 'unknown')) replaceStatement(s, ctx)
  else closeRound(s)
  return true
}

function closeRound(s: GameState) {
  const round = s.rounds.at(-1)!
  round.result = scoreRound(round, s.players)
  for (const p of s.players) p.score += round.result.points[p.id] ?? 0
  s.phase = 'reveal'
  s.endsAt = null
  s.remainingMs = null
  s.paused = false
  s.pausedByBack = false
}

function resume(s: GameState, ctx: EngineContext) {
  if (s.phase === 'question' && s.remainingMs !== null) {
    s.endsAt = ctx.now + s.remainingMs
  }
  s.paused = false
  s.remainingMs = null
  s.pausedByBack = false
  s.viewing = null
}

function finish(s: GameState) {
  s.phase = 'final'
  s.endsAt = null
  s.remainingMs = null
  s.paused = false
  s.viewing = null
  s.pausedByBack = false
}

function validChoice(choice: string, cultures: CultureCode[]): choice is Choice {
  return choice === 'unknown' || (cultures as string[]).includes(choice)
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim()
}

/** "Anna" → "Anna 2" → "Anna 3" when the name is taken (case-insensitive). */
function uniqueName(players: Player[], name: string): string {
  const taken = new Set(players.map((p) => p.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  for (let n = 2; ; n++) {
    const candidate = `${name.slice(0, MAX_NAME_LENGTH - 3)} ${n}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}
