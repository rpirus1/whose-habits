import type { CultureCode, Statement } from '@/content/schema'

export type Phase = 'lobby' | 'question' | 'reveal' | 'final'

/** A culture, or the secondary "I don't know" button. */
export type Choice = CultureCode | 'unknown'

export const ROUND_OPTIONS = [10, 15, 20] as const
export const SECONDS_OPTIONS = [15, 20, 30] as const
export const MAX_PLAYERS = 12
export const MIN_PLAYERS_TO_START = 2
export const MAX_NAME_LENGTH = 20
/** Answers that arrive this long after endsAt still count (network delay). */
export const ANSWER_GRACE_MS = 500

export interface Settings {
  cultures: CultureCode[]
  rounds: (typeof ROUND_OPTIONS)[number]
  seconds: (typeof SECONDS_OPTIONS)[number]
}

export interface Player {
  id: string
  name: string
  score: number
  /** From Presence. The host is always connected from its own point of view. */
  connected: boolean
  isHost: boolean
  /** Index of the first round this player may answer (late joiners wait for the next one). */
  playsFrom: number
}

export interface Answer {
  choice: Choice
  /** Host clock time of the player's last *change*; used for the first-correct bonus. */
  at: number
}

export interface RoundResult {
  correctIds: string[]
  bonusId: string | null
  /** Points gained this round, by player id. */
  points: Record<string, number>
  /** How the room split: count per culture plus "unknown". */
  split: Partial<Record<Choice, number>>
}

export interface Round {
  /** Unique within a game; changes when a statement is replaced. */
  id: string
  index: number
  statementId: string
  answer: CultureCode
  answers: Record<string, Answer>
  result: RoundResult | null
}

export interface GameState {
  v: 1
  roomCode: string
  hostId: string
  /** Random id for anonymous metrics; new for every game in the room. */
  gameId: string
  phase: Phase
  settings: Settings
  players: Player[]
  kickedIds: string[]
  /** settings.rounds, capped to the eligible pool at Start. */
  totalRounds: number
  /** Unplayed eligible statement ids, in play order. The first (rounds left) are the plan; the rest are reserve. */
  queue: string[]
  /** Statements shown this game, including replaced ones (for "recently played"). */
  shownIds: string[]
  /** Played rounds; during 'question' and 'reveal' the last one is the current round. */
  rounds: Round[]
  /** Host-clock deadline of the current question; null when not running. */
  endsAt: number | null
  paused: boolean
  /** Time left when paused during a question. */
  remainingMs: number | null
  /** Round index the host went Back to, or null. View only. */
  viewing: number | null
  /** True when Back paused a live question, so Next resumes it. */
  pausedByBack: boolean
}

/** Everything the pure engine needs from the outside world. */
export interface EngineContext {
  now: number
  statements: ReadonlyMap<string, Statement>
  random: () => number
}
