import type { CultureCode, Statement } from '@/content/schema'
import type { GameSource, ReplacedWhy, ReportReason } from '@/lib/events'
export type { ReportReason }

export type Phase = 'lobby' | 'question' | 'reveal' | 'final'

/** A culture, or the secondary "I don't know" button. */
export type Choice = CultureCode | 'unknown'

export const ROUND_OPTIONS = [10, 15, 20] as const
export const SECONDS_OPTIONS = [15, 20, 30] as const
export const MAX_PLAYERS = 12
export const MIN_PLAYERS_TO_START = 2
/** Connected players (host included) needed to keep a game going. A solo mode would set 1. */
export const MIN_PLAYERS_TO_PLAY = 2
/** A dropped connection gets this long to come back before the game holds for the host. */
export const ALONE_GRACE_MS = 15_000
export const MAX_NAME_LENGTH = 20
/** Answers that arrive this long after endsAt still count (network delay). */
export const ANSWER_GRACE_MS = 500
/** A report holds the game this long while the reporter picks a reason. */
export const REPORT_HOLD_MS = 10_000
/** After the host taps Next on a reveal, everyone gets this long to finish reading. */
export const NEXT_COUNTDOWN_MS = 2_000

/** The reasons a reporter can pick, in pop-up order. Closing it gives 'none'. */
export const REPORT_REASONS = [
  'incorrect',
  'outdated',
  'not_unique',
  'offensive',
] as const satisfies readonly ReportReason[]

/** 'pick': the host's 2–6 countries every round. 'random': 4 random countries every round. */
export const GAME_MODES = ['pick', 'random'] as const
export type GameMode = (typeof GAME_MODES)[number]

export interface Settings {
  /** Missing in settings saved before random mode: same as 'pick'. */
  mode?: GameMode
  /** The picked countries. Kept in random mode, so switching back restores them. */
  cultures: CultureCode[]
  rounds: (typeof ROUND_OPTIONS)[number]
  seconds: (typeof SECONDS_OPTIONS)[number]
}

export const DEFAULT_SETTINGS: Settings = { mode: 'pick', cultures: [], rounds: 10, seconds: 20 }

export const isRandom = (settings: Settings) => settings.mode === 'random'

export interface Player {
  id: string
  name: string
  score: number
  /** From Presence. The host is always connected from its own point of view. */
  connected: boolean
  isHost: boolean
  /** Left from their menu mid-game: kept (with their score) until they rejoin. */
  left?: boolean
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
  /** Random mode: this round's answer buttons. Otherwise the game's countries are. */
  options?: CultureCode[]
  answers: Record<string, Answer>
  result: RoundResult | null
}

/** One player's report of one statement. Open while not done and before `until`. */
export interface Report {
  playerId: string
  statementId: string
  /** Host clock: the hold ends here even if the reporter never answers. */
  until: number
  /** Set when the hold ends; the host then sends one analytics event. */
  reason: ReportReason | null
  /** Metrics: host clock when the hold started and ended (equal when the open got lost). */
  openedAt?: number
  doneAt?: number
}

/** Metrics: a statement swapped mid-round, by Skip or because everyone chose "I don't know". */
export interface Replaced {
  statementId: string
  why: ReplacedWhy
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
  /** Connected players when the game started (for the finish-rate metric). */
  playersAtStart: number
  /** Metrics: the current game came from "Play again in this room". */
  replay?: boolean
  /** Metrics: the host created this room via "Host your own game" after playing as a guest. */
  source?: GameSource
  /**
   * The statements this game was planned from: the deck the Worker dealt at Start (the app
   * has no bank). Kept so a host refresh can carry on. Host only: never in a snapshot.
   */
  deck?: Statement[]
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
  /** Reports this game. Open ones hold the reveal: Next and Back wait for them. */
  reports?: Report[]
  /** Metrics: statements replaced this game. */
  replaced?: Replaced[]
  /** Host clock time the host became the only connected player, while others may reconnect. */
  aloneSince?: number | null
  /** Paused because nobody else is here: only End, or Continue once someone is back. */
  waitingForPlayers?: boolean
  /** Host clock time the Next countdown on a reveal ends; then the next question starts. */
  nextAt?: number | null
}

/** Everything the pure engine needs from the outside world. */
export interface EngineContext {
  now: number
  statements: ReadonlyMap<string, Statement>
  random: () => number
}
