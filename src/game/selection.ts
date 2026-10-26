// Relative imports only: the Worker bundles this file too (worker/deck.ts).
import { CULTURE_CODES } from '../content/schema'
import type { CultureCode, Obviousness, Statement } from '../content/schema'
import { shuffle } from './random'

/**
 * Where a game's answers come from: the countries the host picked, or 'random', where every
 * statement can come up and each round shows its own OPTIONS_PER_ROUND countries.
 */
export type Countries = readonly CultureCode[] | 'random'

/** Answer buttons per round in random mode. */
export const OPTIONS_PER_ROUND = 4

export interface Eligible {
  statement: Statement
  /** The one selected culture this statement fits: the correct answer in this game. */
  answer: CultureCode
}

/**
 * The ambiguity rule: usable only if exactly one selected culture is in `fits`.
 * In random mode every statement is usable, answered by the culture it was written for
 * (its id prefix); randomOptions then leaves the other cultures it fits off the buttons.
 */
export function eligibleStatements(
  statements: Iterable<Statement>,
  cultures: Countries,
): Eligible[] {
  const out: Eligible[] = []
  for (const statement of statements) {
    const answer = answerFor(statement, cultures)
    if (answer) out.push({ statement, answer })
  }
  return out
}

function answerFor(statement: Statement, cultures: Countries): CultureCode | undefined {
  if (cultures === 'random') {
    const own = statement.id.slice(0, 2).toUpperCase() as CultureCode
    return statement.fits.includes(own) ? own : statement.fits[0]
  }
  const matches = statement.fits.filter((f) => cultures.includes(f))
  return matches.length === 1 ? matches[0] : undefined
}

/**
 * A random-mode round's buttons: the answer plus cultures the statement doesn't fit, so exactly
 * one button is right. In the usual country order, so the answer's place is random anyway.
 */
export function randomOptions(
  statement: Statement,
  answer: CultureCode,
  random: () => number,
): CultureCode[] {
  const others = shuffle(
    CULTURE_CODES.filter((c) => !statement.fits.includes(c)),
    random,
  ).slice(0, OPTIONS_PER_ROUND - 1)
  return CULTURE_CODES.filter((c) => c === answer || others.includes(c))
}

/** Extra statements kept back so the host's Skip can be replaced. */
export const RESERVE_SIZE = 3

/**
 * How many statements a game with these countries can use, from the statements' `fits` only.
 * The setup screen counts with this, so the app doesn't need the statements themselves.
 */
export function eligibleCount(fits: Iterable<readonly CultureCode[]>, cultures: Countries) {
  let count = 0
  for (const f of fits) {
    if (cultures === 'random' || f.filter((c) => cultures.includes(c)).length === 1) count++
  }
  return count
}

/** Reserve statements a deck carries per answer culture, for the host's Skip. */
export const DECK_RESERVE_PER_CULTURE = 2

/**
 * One game's statements, dealt by the Worker from the whole bank: the planned rounds plus a
 * reserve of up to DECK_RESERVE_PER_CULTURE per answer culture. The host's engine plans the
 * game again from this deck alone, so the bank itself never reaches the browser.
 */
export function dealDeck(
  statements: Iterable<Statement>,
  cultures: Countries,
  rounds: number,
  random: () => number,
  recentIds: ReadonlySet<string> = new Set(),
): Statement[] {
  const eligible = new Map(eligibleStatements(statements, cultures).map((e) => [e.statement.id, e]))
  const queue = planGame(
    [...eligible.values()].map((e) => e.statement),
    cultures,
    rounds,
    random,
    recentIds,
  )
  const plan = queue.slice(0, rounds)
  const perCulture = new Map<CultureCode, number>()
  const reserve = queue.slice(rounds).filter((id) => {
    const { answer } = eligible.get(id)!
    const taken = perCulture.get(answer) ?? 0
    if (taken >= DECK_RESERVE_PER_CULTURE) return false
    perCulture.set(answer, taken + 1)
    return true
  })
  return [...plan, ...reserve].map((id) => eligible.get(id)!.statement)
}

/** Largest round count the pool supports, so the settings screen can disable bigger options. */
export function maxPlayableRounds(statements: Iterable<Statement>, cultures: Countries) {
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
  cultures: Countries,
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
  cultures: Countries,
  replaced: Statement,
  answer: CultureCode,
): number {
  let best = -1
  let bestCost = Infinity
  for (let i = roundsLeft; i < queue.length; i++) {
    const s = statements.get(queue[i])
    if (!s) continue
    const sameCulture = answerFor(s, cultures) === answer
    const cost = (sameCulture ? 0 : 10) + Math.abs(s.obviousness - replaced.obviousness)
    if (cost < bestCost) {
      best = i
      bestCost = cost
    }
  }
  return best
}
