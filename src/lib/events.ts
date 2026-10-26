// Anonymous product events, shared by the app (sender) and the Worker (receiver).
// No names, no player ids, no IPs: only game-level facts and counts. Relative imports only,
// so the Workers can bundle this file too.

export type PlayAgainVote = 'yes' | 'maybe' | 'no'
export type Role = 'host' | 'guest'
/** Why a player reported a statement; 'none' when they closed the pop-up or it timed out. */
export type ReportReason = 'incorrect' | 'outdated' | 'not_unique' | 'offensive' | 'none'
/**
 * How the host got to /new: from the lander's "Host a game", via "Host your own game" after
 * playing as a guest, or anything else (a bookmark, a typed URL).
 */
export type GameSource = 'direct' | 'lander' | 'guest_cta'
/** 'pick': the host's countries every round. 'random': 4 random countries every round. */
export type EventGameMode = 'pick' | 'random'
/**
 * Why a statement was swapped for another mid-round. Only 'skip' is sent now; 'unknown'
 * (everyone chose "I don't know") came from builds before 26 Oct 2026, which swapped those
 * rounds instead of revealing them. Still parsed, so old tabs' events aren't dropped.
 */
export type ReplacedWhy = 'skip' | 'unknown'
/** The lander buttons we count. */
export type LanderTarget = 'host_header' | 'host_hero' | 'host_footer' | 'join_code' | 'rejoin'
/** A guest's way into a room: opened the link, typed a name, got in, reached the final screen. */
export type JoinStep = 'opened' | 'named' | 'joined' | 'final'

export type AnalyticsEvent = EventBody & {
  /** Sent from a developer's device (localhost or ?test=1); the queries leave these out. */
  test?: true
}

type EventBody =
  | {
      type: 'game_started'
      gameId: string
      players: number
      mode: EventGameMode
      /** The picked countries; empty in random mode. */
      cultures: string[]
      rounds: number
      seconds: number
      /** Started with "Play again in this room" after a finished game. */
      replay: boolean
      source: GameSource
    }
  | {
      type: 'game_finished'
      gameId: string
      roundsPlayed: number
      totalRounds: number
      playersAtStart: number
      playersAtEnd: number
      /** The host pressed End game before the last round. */
      endedEarly: boolean
    }
  | { type: 'play_again_vote'; gameId: string; vote: PlayAgainVote; role: Role }
  /** A guest tapped "Host your own game" on the final screen (guest → host conversion). */
  | { type: 'host_cta_click'; gameId: string }
  | { type: 'share_click'; gameId: string; role: Role }
  /** A report at the reveal, sent by the host when its hold ends. No player id. */
  | {
      type: 'report'
      gameId: string
      statementId: string
      reason: ReportReason
      /** Statement version (see statementVersion); absent from older builds. */
      v?: string
      /** How long this report held the game, in ms (0 when the hold message got lost). */
      heldMs?: number
      /** This reporter's 1st, 2nd, … report in this game. Counted on the host; no id leaves it. */
      nth?: number
    }
  /** One per played round, sent by the host after the reveal: how the room answered. */
  | {
      type: 'round_result'
      gameId: string
      statementId: string
      v: string
      /** The culture that counted as correct in this game (one of the statement's fits). */
      answer: string
      /** Answers per culture, plus "unknown" for "I don't know". Missing = 0. */
      split: Record<string, number>
    }
  /** A statement swapped mid-round: the host pressed Skip, or everyone chose "I don't know". */
  | { type: 'statement_replaced'; gameId: string; statementId: string; v: string; why: ReplacedWhy }
  /** A button on the lander. Not tied to a game. */
  | { type: 'lander_click'; gameId?: undefined; target: LanderTarget }
  /** A guest's step into a room. Only 'final' has a game id; the room code is never sent. */
  | { type: 'join_step'; gameId?: string; step: JoinStep }

export const MAX_EVENT_BYTES = 1024

/**
 * Events reaching the Worker on `*.workers.dev` are tests. Before launch that was every event;
 * since www.whosehabits.com it's old cached tabs and previews, while the custom domain stores
 * real events. The Worker decides by its own host name, so older clients are covered too.
 */
export const isPreviewHost = (hostname: string) =>
  hostname === 'workers.dev' || hostname.endsWith('.workers.dev')

/**
 * A short version of a statement's wording and fits (FNV-1a, 8 hex chars). Edited rows keep
 * their id, so events carry this to tell results and reports on the old wording apart.
 */
export function statementVersion(s: { text: string; fits: readonly string[] }): string {
  let hash = 0x811c9dc5
  for (const ch of `${s.text}|${[...s.fits].sort().join(' ')}`) {
    hash ^= ch.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

const REPORT_REASONS = ['incorrect', 'outdated', 'not_unique', 'offensive', 'none'] as const
const LANDER_TARGETS = ['host_header', 'host_hero', 'host_footer', 'join_code', 'rejoin'] as const
const JOIN_STEPS = ['opened', 'named', 'joined', 'final'] as const
const ID = /^[0-9a-f-]{36}$/
const STATEMENT_ID = /^[a-z]{2}-\d{3}$/
const CULTURE = /^[A-Z]{2}$/
const VERSION = /^[0-9a-f]{8}$/
const REPORT_HOLD_MAX_MS = 15_000

const int = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T =>
  typeof v === 'string' && (values as readonly string[]).includes(v)
const statementId = (v: unknown): v is string => typeof v === 'string' && STATEMENT_ID.test(v)
const version = (v: unknown): v is string => typeof v === 'string' && VERSION.test(v)

/** Validates untrusted input and returns a clean event with only known fields, or null. */
export function parseEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== 'object') return null
  const e = input as Record<string, unknown>
  const body = parseBody(e)
  if (!body) return null
  return e.test === true ? { ...body, test: true } : body
}

function parseBody(e: Record<string, unknown>): EventBody | null {
  // Events that happen outside a game.
  if (e.type === 'lander_click') {
    return oneOf(e.target, LANDER_TARGETS) ? { type: 'lander_click', target: e.target } : null
  }
  if (e.type === 'join_step') {
    if (!oneOf(e.step, JOIN_STEPS)) return null
    if (e.step !== 'final') return { type: 'join_step', step: e.step }
    if (typeof e.gameId !== 'string' || !ID.test(e.gameId)) return null
    return { type: 'join_step', step: e.step, gameId: e.gameId }
  }

  if (typeof e.gameId !== 'string' || !ID.test(e.gameId)) return null
  const gameId = e.gameId

  switch (e.type) {
    case 'game_started': {
      const cultures = e.cultures
      if (
        !int(e.players, 12) ||
        !Array.isArray(cultures) ||
        cultures.length > 6 ||
        !cultures.every((c) => typeof c === 'string' && CULTURE.test(c)) ||
        !int(e.rounds, 20) ||
        !int(e.seconds, 30) ||
        // Optional, so a tab still running an older build doesn't lose its events.
        (e.replay !== undefined && typeof e.replay !== 'boolean') ||
        (e.source !== undefined && !oneOf(e.source, ['direct', 'lander', 'guest_cta'] as const)) ||
        (e.mode !== undefined && !oneOf(e.mode, ['pick', 'random'] as const))
      )
        return null
      return {
        type: 'game_started',
        gameId,
        players: e.players,
        // Older builds didn't send it: they only had picked countries.
        mode: e.mode === 'random' ? 'random' : 'pick',
        cultures: cultures as string[],
        rounds: e.rounds,
        seconds: e.seconds,
        replay: e.replay === true,
        source: oneOf(e.source, ['lander', 'guest_cta'] as const) ? e.source : 'direct',
      }
    }
    case 'game_finished':
      if (
        !int(e.roundsPlayed, 20) ||
        !int(e.totalRounds, 20) ||
        !int(e.playersAtStart, 12) ||
        !int(e.playersAtEnd, 12) ||
        typeof e.endedEarly !== 'boolean'
      )
        return null
      return {
        type: 'game_finished',
        gameId,
        roundsPlayed: e.roundsPlayed,
        totalRounds: e.totalRounds,
        playersAtStart: e.playersAtStart,
        playersAtEnd: e.playersAtEnd,
        endedEarly: e.endedEarly,
      }
    case 'play_again_vote':
      if (
        !oneOf(e.vote, ['yes', 'maybe', 'no'] as const) ||
        !oneOf(e.role, ['host', 'guest'] as const)
      )
        return null
      return { type: 'play_again_vote', gameId, vote: e.vote, role: e.role }
    case 'host_cta_click':
      return { type: 'host_cta_click', gameId }
    case 'share_click':
      if (!oneOf(e.role, ['host', 'guest'] as const)) return null
      return { type: 'share_click', gameId, role: e.role }
    case 'report': {
      if (
        !statementId(e.statementId) ||
        // Optional: older builds sent reports without these.
        (e.reason !== undefined && !oneOf(e.reason, REPORT_REASONS)) ||
        (e.v !== undefined && !version(e.v)) ||
        (e.heldMs !== undefined && !int(e.heldMs, REPORT_HOLD_MAX_MS)) ||
        (e.nth !== undefined && (!int(e.nth, 50) || e.nth < 1))
      )
        return null
      const report: EventBody = {
        type: 'report',
        gameId,
        statementId: e.statementId,
        reason: e.reason === undefined ? 'none' : e.reason,
      }
      if (e.v !== undefined) report.v = e.v
      if (e.heldMs !== undefined) report.heldMs = e.heldMs
      if (e.nth !== undefined) report.nth = e.nth
      return report
    }
    case 'round_result': {
      const split = e.split
      if (
        !statementId(e.statementId) ||
        !version(e.v) ||
        typeof e.answer !== 'string' ||
        !CULTURE.test(e.answer) ||
        !split ||
        typeof split !== 'object' ||
        Array.isArray(split)
      )
        return null
      const entries = Object.entries(split)
      if (
        entries.length > 11 ||
        !entries.every(([k, n]) => (k === 'unknown' || CULTURE.test(k)) && int(n, 12))
      )
        return null
      return {
        type: 'round_result',
        gameId,
        statementId: e.statementId,
        v: e.v,
        answer: e.answer,
        split: Object.fromEntries(entries.filter(([, n]) => (n as number) > 0)) as Record<
          string,
          number
        >,
      }
    }
    case 'statement_replaced':
      if (
        !statementId(e.statementId) ||
        !version(e.v) ||
        !oneOf(e.why, ['skip', 'unknown'] as const)
      )
        return null
      return { type: 'statement_replaced', gameId, statementId: e.statementId, v: e.v, why: e.why }
    default:
      return null
  }
}
