// Messages on the room's Supabase broadcast channel, and the public snapshot the host sends.
// Guest messages are untrusted input: the host parses them with parseGuestMessage.
import type { CultureCode, Obviousness } from '@/content/schema'
import { percentCorrect } from './scoring'
import type { Choice, GameState, Phase, Round, Settings } from './types'
import type { Statement } from '@/content/schema'

// ── Guest → host ────────────────────────────────────────────────────────────

export type GuestMessage =
  /** Join, or rejoin after a refresh. Also asks the host to re-send the snapshot. */
  | { type: 'hello'; playerId: string; name: string }
  | { type: 'answer'; playerId: string; roundId: string; choice: Choice }
  /** Clock sync: the guest's send time. */
  | { type: 'ping'; playerId: string; t0: number }

// ── Host → guests ───────────────────────────────────────────────────────────

export type HostMessage =
  | { type: 'state'; snapshot: Snapshot }
  | { type: 'pong'; playerId: string; t0: number; hostNow: number }
  | { type: 'rejected'; playerId: string; reason: 'full' | 'kicked' }

/** Everything on one broadcast event name; `type` tells the messages apart. */
export const CHANNEL_EVENT = 'msg'
export const channelName = (roomCode: string) => `room:${roomCode}`

export interface PublicPlayer {
  id: string
  name: string
  score: number
  connected: boolean
  isHost: boolean
}

export interface PublicQuestion {
  roundId: string
  index: number
  total: number
  text: string
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
    players: s.players.map(({ id, name, score, connected, isHost }) => ({
      id,
      name,
      score,
      connected,
      isHost,
    })),
    question:
      s.phase === 'question' && current
        ? {
            roundId: current.id,
            index: current.index,
            total: s.totalRounds,
            text: statements.get(current.statementId)?.text ?? '',
            endsAt: s.endsAt,
            remainingMs: s.remainingMs,
            answeredIds: Object.keys(current.answers),
            answeringIds: s.players.filter((p) => p.playsFrom <= current.index).map((p) => p.id),
          }
        : null,
    reveal: revealRound?.result ? toReveal(revealRound, s.totalRounds, statements) : null,
    viewing: s.viewing !== null,
    final: s.phase === 'final' ? finalSummary(s, statements) : null,
  }
}

function toReveal(
  round: Round,
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
    note: statement?.note ?? '',
    split: result.split,
    correctIds: result.correctIds,
    bonusId: result.bonusId,
    points: result.points,
    choices: Object.fromEntries(Object.entries(round.answers).map(([id, a]) => [id, a.choice])),
  }
}

export const SURPRISING_COUNT = 3

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
    default:
      return null
  }
}
