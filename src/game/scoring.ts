import type { Choice, Player, Round, RoundResult } from './types'

export const POINTS_CORRECT = 1
export const POINTS_FIRST_CORRECT_BONUS = 1

/**
 * Quiz scoring: +1 for the correct culture, +1 bonus for whoever settled on it first.
 * `answer.at` is when the host received the player's last change, so switching away
 * and back loses your place. Exact-millisecond ties go to the earlier joiner.
 */
export function scoreRound(round: Round, players: readonly Player[]): RoundResult {
  const order = new Map(players.map((p, i) => [p.id, i]))
  const split: Partial<Record<Choice, number>> = {}
  const points: Record<string, number> = {}
  const correct: { id: string; at: number }[] = []

  for (const [id, { choice, at }] of Object.entries(round.answers)) {
    split[choice] = (split[choice] ?? 0) + 1
    if (choice === round.answer) {
      correct.push({ id, at })
      points[id] = POINTS_CORRECT
    }
  }
  correct.sort((a, b) => a.at - b.at || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  const bonusId = correct[0]?.id ?? null
  if (bonusId) points[bonusId] += POINTS_FIRST_CORRECT_BONUS

  return { correctIds: correct.map((c) => c.id), bonusId, points, split }
}

/** Share of players who answered (including "I don't know") and got it right. */
export function percentCorrect(round: Round): number {
  const answered = Object.keys(round.answers).length
  return answered ? (round.result?.correctIds.length ?? 0) / answered : 0
}
