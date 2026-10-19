import type { CultureCode, Obviousness, Statement } from '@/content/schema'
import { shuffle } from './random'

export interface Eligible {
  statement: Statement
  /** The one selected culture this statement fits: the correct answer in this game. */
  answer: CultureCode
}

/** The ambiguity rule: usable only if exactly one selected culture is in `fits`. */
export function eligibleStatements(
  statements: Iterable<Statement>,
  cultures: readonly CultureCode[],
): Eligible[] {
  const out: Eligible[] = []
  for (const statement of statements) {
    const matches = statement.fits.filter((f) => cultures.includes(f))
    if (matches.length === 1) out.push({ statement, answer: matches[0] })
  }
  return out
}

/** Extra statements kept back so Skip and all-"I don't know" can be replaced. */
export const RESERVE_SIZE = 3

/** Largest round count the pool supports, so the settings screen can disable bigger options. */
export function maxPlayableRounds(
  statements: Iterable<Statement>,
  cultures: readonly CultureCode[],
) {
  return Math.max(0, eligibleStatements(statements, cultures).length - RESERVE_SIZE)
}

/** Target obviousness for a round: easy first third, medium middle, hard last third. */
export function targetObviousness(index: number, rounds: number): Obviousness {
  const third = rounds / 3
  return index < third ? 1 : index < 2 * third ? 2 : 3
}

/**
 * Orders the eligible pool for a game. The first `rounds` ids are the plan:
 * correct answers balanced across cultures (shuffled round-robin, no culture twice in a row
 * when avoidable), obviousness ramping 1 → 2 → 3, recently played statements last.
 * The rest of the list is the reserve for replacements.
 */
export function planGame(
  statements: Iterable<Statement>,
  cultures: readonly CultureCode[],
  rounds: number,
  random: () => number,
  recentIds: ReadonlySet<string> = new Set(),
): string[] {
  const pools = new Map<CultureCode, Statement[]>()
  for (const { statement, answer } of eligibleStatements(statements, cultures)) {
    pools.set(answer, [...(pools.get(answer) ?? []), statement])
  }
  // Shuffle, then move recently played to the back (stable sort keeps the shuffle otherwise).
  for (const [culture, pool] of pools) {
    pools.set(
      culture,
      shuffle(pool, random).sort(
        (a, b) => Number(recentIds.has(a.id)) - Number(recentIds.has(b.id)),
      ),
    )
  }

  const plan: string[] = []
  let order: CultureCode[] = []
  let last: CultureCode | undefined
  for (let index = 0; index < rounds; index++) {
    const available = [...pools.keys()].filter((c) => pools.get(c)!.length > 0)
    if (!available.length) break
    if (!order.some((c) => available.includes(c))) {
      order = shuffle(available, random)
      // Avoid the same culture twice in a row across cycle boundaries.
      if (order.length > 1 && order[0] === last) order.push(order.shift()!)
    }
    const culture = order.find((c) => available.includes(c))!
    order = order.filter((c) => c !== culture)
    last = culture

    const pool = pools.get(culture)!
    const pick = closestObviousness(pool, targetObviousness(index, rounds), recentIds)
    pool.splice(pool.indexOf(pick), 1)
    plan.push(pick.id)
  }

  const reserve = shuffle([...pools.values()].flat(), random).sort(
    (a, b) => Number(recentIds.has(a.id)) - Number(recentIds.has(b.id)),
  )
  return [...plan, ...reserve.map((s) => s.id)]
}

/** Prefers not-recent, then the closest obviousness; pool order breaks ties. */
function closestObviousness(
  pool: Statement[],
  target: Obviousness,
  recentIds: ReadonlySet<string>,
): Statement {
  const cost = (s: Statement) => (recentIds.has(s.id) ? 10 : 0) + Math.abs(s.obviousness - target)
  return pool.reduce((best, s) => (cost(s) < cost(best) ? s : best))
}

/**
 * Picks the replacement for a skipped statement from the reserve (queue positions after the
 * rounds still to play): same correct culture and closest obviousness if possible.
 * Returns the queue index, or -1 when the reserve is empty.
 */
export function pickReplacement(
  queue: readonly string[],
  roundsLeft: number,
  statements: ReadonlyMap<string, Statement>,
  cultures: readonly CultureCode[],
  replaced: Statement,
  answer: CultureCode,
): number {
  let best = -1
  let bestCost = Infinity
  for (let i = roundsLeft; i < queue.length; i++) {
    const s = statements.get(queue[i])
    if (!s) continue
    const sameCulture = s.fits.filter((f) => cultures.includes(f))[0] === answer
    const cost = (sameCulture ? 0 : 10) + Math.abs(s.obviousness - replaced.obviousness)
    if (cost < bestCost) {
      best = i
      bestCost = cost
    }
  }
  return best
}
