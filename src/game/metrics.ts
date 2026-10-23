// Statement-level metrics the host sends: one event per played round, per replaced
// statement and per finished report. Pure, so the host hook only has to send them once each
// (the key is for trackOnce and stays on the host's device; events carry no player ids).
import type { Statement } from '@/content/schema'
import { statementVersion } from '@/lib/events'
import type { AnalyticsEvent } from '@/lib/events'
import type { GameState } from './types'

export interface KeyedEvent {
  key: string
  event: AnalyticsEvent
}

export function statementEvents(
  s: GameState,
  statements: ReadonlyMap<string, Statement>,
): KeyedEvent[] {
  const { gameId } = s
  if (!gameId) return []
  const version = (id: string) => {
    const statement = statements.get(id)
    return statement ? statementVersion(statement) : null
  }
  const out: KeyedEvent[] = []

  for (const round of s.rounds) {
    const v = version(round.statementId)
    if (!round.result || !v) continue
    const split: Record<string, number> = {}
    for (const [choice, n] of Object.entries(round.result.split)) if (n) split[choice] = n
    out.push({
      key: `round:${gameId}:${round.id}`,
      event: {
        type: 'round_result',
        gameId,
        statementId: round.statementId,
        v,
        answer: round.answer,
        split,
      },
    })
  }

  for (const [i, r] of (s.replaced ?? []).entries()) {
    const v = version(r.statementId)
    if (!v) continue
    out.push({
      key: `replaced:${gameId}:${i}:${r.statementId}`,
      event: { type: 'statement_replaced', gameId, statementId: r.statementId, v, why: r.why },
    })
  }

  // nth = this reporter's 1st, 2nd, … report in this game, counted here on the host.
  const perPlayer = new Map<string, number>()
  for (const r of s.reports ?? []) {
    const nth = (perPlayer.get(r.playerId) ?? 0) + 1
    perPlayer.set(r.playerId, nth)
    if (r.reason === null) continue
    const v = version(r.statementId)
    const event: AnalyticsEvent = {
      type: 'report',
      gameId,
      statementId: r.statementId,
      reason: r.reason,
      nth: Math.min(nth, 50),
    }
    if (v) event.v = v
    if (r.openedAt !== undefined && r.doneAt !== undefined) {
      event.heldMs = Math.max(0, Math.min(15_000, Math.round(r.doneAt - r.openedAt)))
    }
    // Same key as before this field existed, so a report is never sent twice after an update.
    out.push({ key: `report:${gameId}:${r.playerId}:${r.statementId}`, event })
  }
  return out
}
