// Messages on the room's Supabase broadcast channel, and the public snapshot the host sends.
// Every message is untrusted input: the host parses guest messages with parseGuestMessage,
// guests parse host messages with parseHostMessage.
import { CULTURE_CODES } from '@/content/schema'
import type { CultureCode, Obviousness } from '@/content/schema'
import { percentCorrect } from './scoring'
import { roundOptions } from './engine'
import { GAME_MODES, REPORT_REASONS, ROUND_OPTIONS, SECONDS_OPTIONS } from './types'
import type { Choice, GameState, Phase, ReportReason, Round, Settings } from './types'
import type { Statement } from '@/content/schema'

// ── Guest → host ────────────────────────────────────────────────────────────

export type GuestMessage =
  /** Join, or rejoin after a refresh. Also asks the host to re-send the snapshot. */
  | { type: 'hello'; playerId: string; name: string }
  | { type: 'answer'; playerId: string; roundId: string; choice: Choice }
  /** Clock sync: the guest's send time. */
  | { type: 'ping'; playerId: string; t0: number }
  /** The player left from their menu. Unlike a kick, they may rejoin. */
  | { type: 'leave'; playerId: string }
  /** Opened the report pop-up: the host holds the game for everyone. */
  | { type: 'reportOpen'; playerId: string; statementId: string }
  | { type: 'reportDone'; playerId: string; statementId: string; reason: ReportReason }

// ── Host → guests ───────────────────────────────────────────────────────────

export type HostMessage =
  | { type: 'state'; snapshot: Snapshot }
  | { type: 'pong'; playerId: string; t0: number; hostNow: number }
  | { type: 'rejected'; playerId: string; reason: 'full' | 'kicked' }
  /** The host has this choice recorded; the guest stops re-sending it. */
  | { type: 'ack'; playerId: string; roundId: string; choice: Choice }

/** Everything on one broadcast event name; `type` tells the messages apart. */
export const CHANNEL_EVENT = 'msg'
export const channelName = (roomCode: string) => `room:${roomCode}`

export interface PublicPlayer {
  id: string
  name: string
  score: number
  connected: boolean
  isHost: boolean
  /** Left the game from their menu (their score still counts). */
  left?: boolean
}

export interface PublicQuestion {
  roundId: string
  index: number
  total: number
  text: string
  /** The answer buttons, in order (the game's countries, or this round's in random mode). */
  options: CultureCode[]
  /** Host clock. Guests subtract their clock offset. Null while paused. */
  endsAt: number | null
  remainingMs: number | null
  answeredIds: string[]
  /** Players who may answer this round (late joiners are not in it). */
  answeringIds: string[]
}

export interface PublicReveal {
  index: number
  total: number
  statementId: string
  text: string
  answer: CultureCode
  /** The buttons this round had, for the split bars. */
  options: CultureCode[]
  note: string
  split: Partial<Record<Choice, number>>
  correctIds: string[]
  bonusId: string | null
  points: Record<string, number>
  /** Each player's final choice, so everyone sees their own result. */
  choices: Record<string, Choice>
}

export interface SurprisingStatement {
  statementId: string
  text: string
  answer: CultureCode
  note: string
  percentCorrect: number
}

export interface FinalSummary {
  /** Player ids, best first. Equal scores share a rank. */
  ranking: { id: string; rank: number }[]
  surprising: SurprisingStatement[]
  roundsPlayed: number
}

export interface Snapshot {
  v: 1
  /** Increases with every broadcast; guests drop older snapshots that arrive late. */
  seq: number
  hostId: string
  roomCode: string
  gameId: string
  phase: Phase
  paused: boolean
  settings: Settings
  players: PublicPlayer[]
  /** The live question (also while the host views an earlier reveal). No answer in it. */
  question: PublicQuestion | null
  /** The current reveal, or the earlier one the host went Back to. */
  reveal: PublicReveal | null
  /** True when `reveal` is an earlier round the host is re-viewing. */
  viewing: boolean
  final: FinalSummary | null
  /** Host clock time a report hold ends, or null. Anonymous: not who is reporting. */
  holdUntil: number | null
  /** Host clock time the Next countdown on a reveal ends, or null. Optional: older hosts lack it. */
  nextAt?: number | null
}

export function toSnapshot(
  s: GameState,
  statements: ReadonlyMap<string, Statement>,
  seq: number,
): Snapshot {
  const current = s.phase === 'question' || s.phase === 'reveal' ? s.rounds.at(-1) : undefined
  const revealRound =
    s.viewing !== null ? s.rounds[s.viewing] : s.phase === 'reveal' ? current : undefined

  return {
    v: 1,
    seq,
    hostId: s.hostId,
    roomCode: s.roomCode,
    gameId: s.gameId,
    phase: s.phase,
    paused: s.paused,
    settings: s.settings,
    players: s.players.map(({ id, name, score, connected, isHost, left }) => ({
      id,
      name,
      score,
      connected,
      isHost,
      ...(left && { left }),
    })),
    question:
      s.phase === 'question' && current
        ? {
            roundId: current.id,
            index: current.index,
            total: s.totalRounds,
            text: statements.get(current.statementId)?.text ?? '',
            options: roundOptions(s, current),
            endsAt: s.endsAt,
            remainingMs: s.remainingMs,
            answeredIds: Object.keys(current.answers),
            answeringIds: s.players.filter((p) => p.playsFrom <= current.index).map((p) => p.id),
          }
        : null,
    reveal: revealRound?.result
      ? toReveal(revealRound, roundOptions(s, revealRound), s.totalRounds, statements)
      : null,
    viewing: s.viewing !== null,
    final: s.phase === 'final' ? finalSummary(s, statements) : null,
    holdUntil: holdEnd(s),
    nextAt: s.nextAt ?? null,
  }
}

function holdEnd(s: GameState): number | null {
  const open = (s.reports ?? []).filter((r) => r.reason === null)
  return open.length ? Math.max(...open.map((r) => r.until)) : null
}

function toReveal(
  round: Round,
  options: CultureCode[],
  total: number,
  statements: ReadonlyMap<string, Statement>,
): PublicReveal {
  const statement = statements.get(round.statementId)
  const result = round.result!
  return {
    index: round.index,
    total,
    statementId: round.statementId,
    text: statement?.text ?? '',
    answer: round.answer,
    options,
    note: statement?.note ?? '',
    split: result.split,
    correctIds: result.correctIds,
    bonusId: result.bonusId,
    points: result.points,
    choices: Object.fromEntries(Object.entries(round.answers).map(([id, a]) => [id, a.choice])),
  }
}

export const SURPRISING_COUNT = 2

export function finalSummary(
  s: GameState,
  statements: ReadonlyMap<string, Statement>,
): FinalSummary {
  const sorted = [...s.players].sort((a, b) => b.score - a.score)
  const ranking = sorted.map((p) => ({
    id: p.id,
    rank: sorted.findIndex((q) => q.score === p.score) + 1,
  }))

  // Lowest % correct first; among equals, the "obvious" ones people still missed are more surprising.
  const obviousness = (r: Round): Obviousness => statements.get(r.statementId)?.obviousness ?? 2
  const surprising = s.rounds
    .filter((r) => r.result && Object.keys(r.answers).length > 0)
    .sort((a, b) => percentCorrect(a) - percentCorrect(b) || obviousness(a) - obviousness(b))
    .slice(0, SURPRISING_COUNT)
    .map((r) => ({
      statementId: r.statementId,
      text: statements.get(r.statementId)?.text ?? '',
      answer: r.answer,
      note: statements.get(r.statementId)?.note ?? '',
      percentCorrect: percentCorrect(r),
    }))

  return { ranking, surprising, roundsPlayed: s.rounds.length }
}

// ── Validation of untrusted guest input ─────────────────────────────────────

const isString = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length <= max

export function parseGuestMessage(payload: unknown): GuestMessage | null {
  if (!payload || typeof payload !== 'object') return null
  const m = payload as Record<string, unknown>
  if (!isString(m.playerId) || !m.playerId) return null
  switch (m.type) {
    case 'hello':
      return isString(m.name, 100) ? { type: 'hello', playerId: m.playerId, name: m.name } : null
    case 'answer':
      return isString(m.roundId, 100) && isString(m.choice, 16)
        ? {
            type: 'answer',
            playerId: m.playerId,
            roundId: m.roundId,
            choice: m.choice as Choice, // the engine checks it against the selected cultures
          }
        : null
    case 'ping':
      return typeof m.t0 === 'number' && Number.isFinite(m.t0)
        ? { type: 'ping', playerId: m.playerId, t0: m.t0 }
        : null
    case 'leave':
      return { type: 'leave', playerId: m.playerId }
    case 'reportOpen':
      return isString(m.statementId, 16)
        ? { type: 'reportOpen', playerId: m.playerId, statementId: m.statementId }
        : null
    case 'reportDone':
      return isString(m.statementId, 16) &&
        (m.reason === 'none' || (REPORT_REASONS as readonly unknown[]).includes(m.reason))
        ? {
            type: 'reportDone',
            playerId: m.playerId,
            statementId: m.statementId,
            reason: m.reason as ReportReason,
          }
        : null
    default:
      return null
  }
}

// ── Validation of host messages on guests ───────────────────────────────────
// Anyone in the room can broadcast, so a guest can't trust that a "host" message came from
// the host. This doesn't prove who sent it; it keeps a malformed one from breaking the screen.

type Check = (v: unknown) => boolean

const str =
  (max = 64): Check =>
  (v) =>
    typeof v === 'string' && v.length <= max
const num: Check = (v) => typeof v === 'number' && Number.isFinite(v)
const bool: Check = (v) => typeof v === 'boolean'
const nullable =
  (check: Check): Check =>
  (v) =>
    v === null || check(v)
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v)
const oneOf =
  (values: readonly unknown[]): Check =>
  (v) =>
    values.includes(v)
const list =
  (check: Check, max: number): Check =>
  (v) =>
    Array.isArray(v) && v.length <= max && v.every(check)
const record =
  (key: Check, value: Check, max: number): Check =>
  (v) =>
    isObject(v) &&
    Object.keys(v).length <= max &&
    Object.entries(v).every(([k, x]) => key(k) && value(x))
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    isObject(v) && Object.entries(fields).every(([k, check]) => check(v[k]))

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Generous limits: real snapshots stay far below them.
const ID = str()
const TEXT = str(1000)
const MAX_LIST = 64
const ids = list(ID, MAX_LIST)
const culture = oneOf(CULTURE_CODES)
const choice = oneOf([...CULTURE_CODES, 'unknown'])

const isSnapshot = shape({
  v: oneOf([1]),
  seq: num,
  hostId: ID,
  roomCode: ID,
  gameId: ID,
  phase: oneOf(['lobby', 'question', 'reveal', 'final'] satisfies Phase[]),
  paused: bool,
  settings: shape({
    mode: optional(oneOf(GAME_MODES)),
    cultures: list(culture, CULTURE_CODES.length),
    rounds: oneOf(ROUND_OPTIONS),
    seconds: oneOf(SECONDS_OPTIONS),
  }),
  players: list(
    shape({
      id: ID,
      name: str(),
      score: num,
      connected: bool,
      isHost: bool,
      left: optional(bool),
    }),
    MAX_LIST,
  ),
  question: nullable(
    shape({
      roundId: ID,
      index: num,
      total: num,
      text: TEXT,
      options: list(culture, CULTURE_CODES.length),
      endsAt: nullable(num),
      remainingMs: nullable(num),
      answeredIds: ids,
      answeringIds: ids,
    }),
  ),
  reveal: nullable(
    shape({
      index: num,
      total: num,
      statementId: ID,
      text: TEXT,
      answer: culture,
      options: list(culture, CULTURE_CODES.length),
      note: TEXT,
      split: record(choice, num, MAX_LIST),
      correctIds: ids,
      bonusId: nullable(ID),
      points: record(ID, num, MAX_LIST),
      choices: record(ID, choice, MAX_LIST),
    }),
  ),
  viewing: bool,
  final: nullable(
    shape({
      ranking: list(shape({ id: ID, rank: num }), MAX_LIST),
      surprising: list(
        shape({ statementId: ID, text: TEXT, answer: culture, note: TEXT, percentCorrect: num }),
        MAX_LIST,
      ),
      roundsPlayed: num,
    }),
  ),
  holdUntil: nullable(num),
  nextAt: optional(nullable(num)),
})

const isHostMessage: Record<HostMessage['type'], Check> = {
  state: shape({ snapshot: isSnapshot }),
  pong: shape({ playerId: ID, t0: num, hostNow: num }),
  rejected: shape({ playerId: ID, reason: oneOf(['full', 'kicked']) }),
  ack: shape({ playerId: ID, roundId: ID, choice }),
}

/** A well-formed host message, or null. Guest messages on the channel also end up here. */
export function parseHostMessage(payload: unknown): HostMessage | null {
  if (!isObject(payload) || typeof payload.type !== 'string') return null
  const check = isHostMessage[payload.type as HostMessage['type']]
  return Object.hasOwn(isHostMessage, payload.type) && check(payload)
    ? (payload as unknown as HostMessage)
    : null
}
