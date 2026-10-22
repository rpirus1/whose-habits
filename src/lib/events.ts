// Anonymous product events, shared by the app (sender) and the Pages Function (receiver).
// No names, no player ids, no IPs: only game-level facts. Relative imports only, so
// functions/ can bundle this file too.

export type PlayAgainVote = 'yes' | 'maybe' | 'no'
export type Role = 'host' | 'guest'
/** Why a player reported a statement; 'none' when they closed the pop-up or it timed out. */
export type ReportReason = 'incorrect' | 'outdated' | 'not_unique' | 'offensive' | 'none'
/** How the host got to /new: on their own, or via "Host your own game" after playing as a guest. */
export type GameSource = 'direct' | 'guest_cta'

export type AnalyticsEvent = EventBody & {
  /** Sent from a developer's device (localhost or ?test=1); the queries leave these out. */
  test?: true
}

type EventBody =
  | {
      type: 'game_started'
      gameId: string
      players: number
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
  | { type: 'report'; gameId: string; statementId: string; reason: ReportReason }

export const MAX_EVENT_BYTES = 1024

/**
 * Until the game launches on its own domain, every event (from the workers.dev preview URL) is
 * a test. The Worker decides this by its own host name, so cached older clients are covered too.
 */
export const isPreviewHost = (hostname: string) =>
  hostname === 'workers.dev' || hostname.endsWith('.workers.dev')

const REPORT_REASONS = ['incorrect', 'outdated', 'not_unique', 'offensive', 'none'] as const
const ID = /^[0-9a-f-]{36}$/
const STATEMENT_ID = /^[a-z]{2}-\d{3}$/
const CULTURE = /^[A-Z]{2}$/

const int = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T =>
  typeof v === 'string' && (values as readonly string[]).includes(v)

/** Validates untrusted input and returns a clean event with only known fields, or null. */
export function parseEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== 'object') return null
  const e = input as Record<string, unknown>
  const body = parseBody(e)
  if (!body) return null
  return e.test === true ? { ...body, test: true } : body
}

function parseBody(e: Record<string, unknown>): EventBody | null {
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
        (e.source !== undefined && !oneOf(e.source, ['direct', 'guest_cta'] as const))
      )
        return null
      return {
        type: 'game_started',
        gameId,
        players: e.players,
        cultures: cultures as string[],
        rounds: e.rounds,
        seconds: e.seconds,
        replay: e.replay === true,
        source: e.source === 'guest_cta' ? 'guest_cta' : 'direct',
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
    case 'report':
      if (
        typeof e.statementId !== 'string' ||
        !STATEMENT_ID.test(e.statementId) ||
        // Optional: older builds sent reports without a reason.
        (e.reason !== undefined && !oneOf(e.reason, REPORT_REASONS))
      )
        return null
      return {
        type: 'report',
        gameId,
        statementId: e.statementId,
        reason: e.reason === undefined ? 'none' : e.reason,
      }
    default:
      return null
  }
}
