// Per-statement signals for the review page, from round_result, statement_replaced and report
// events (pure, tested). Thresholds and what they mean: docs/ANALYTICS_NEXT.md.

export interface StatementInfo {
  id: string
  text: string
  fits: string[]
  topic: string
  reviewed: boolean
  /** Version of the current wording (statementVersion). */
  v: string
}

/** One stored event, as read from D1: its type and JSON data. */
export interface EventRow {
  type: string
  data: string
}

export const REASONS = ['incorrect', 'outdated', 'not_unique', 'offensive', 'none'] as const
export type Reason = (typeof REASONS)[number]

export type Flag = 'action' | 'review' | 'watch' | null

export interface StatementStats {
  id: string
  culture: string
  info: StatementInfo | undefined
  shown: number
  answered: number
  correct: number
  unknown: number
  /** The wrong culture picked most, and how many picked it. */
  topWrong: { culture: string; count: number } | null
  skips: number
  allUnknown: number
  reports: Record<Reason, number>
  /** Events about a different wording than the current one. */
  olderWording: number
  flag: Flag
  flagWhy: string
}

export const THRESHOLDS = {
  /** Reports with a reason before a row needs review. */
  reports: 2,
  /** Or this report rate … */
  reportRate: 0.1,
  /** … after this many showings. */
  minShown: 5,
  /** Unreviewed rows: % correct below this, with one wrong culture taking at least half … */
  lowCorrect: 0.2,
  /** … or above this (too obvious). */
  highCorrect: 0.95,
}

const parse = (data: string): Record<string, unknown> => {
  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return {}
  }
}

export interface AggregateOptions {
  /** Count only events about the current wording (older ones still show in olderWording). */
  currentOnly?: boolean
}

export function aggregateStatements(
  rows: EventRow[],
  catalog: ReadonlyMap<string, StatementInfo>,
  options: AggregateOptions = {},
): StatementStats[] {
  const stats = new Map<string, StatementStats & { wrong: Record<string, number> }>()
  const get = (id: string) => {
    let s = stats.get(id)
    if (!s) {
      s = {
        id,
        culture: id.slice(0, 2).toUpperCase(),
        info: catalog.get(id),
        shown: 0,
        answered: 0,
        correct: 0,
        unknown: 0,
        topWrong: null,
        skips: 0,
        allUnknown: 0,
        reports: { incorrect: 0, outdated: 0, not_unique: 0, offensive: 0, none: 0 },
        olderWording: 0,
        flag: null,
        flagWhy: '',
        wrong: {},
      }
      stats.set(id, s)
    }
    return s
  }

  for (const row of rows) {
    const d = parse(row.data)
    const id = typeof d.statementId === 'string' ? d.statementId : null
    if (!id) continue
    const s = get(id)
    const current = s.info?.v
    const older = typeof d.v === 'string' && current !== undefined && d.v !== current
    if (older) {
      s.olderWording++
      if (options.currentOnly) continue
    }

    if (row.type === 'round_result') {
      const split = (d.split ?? {}) as Record<string, number>
      const answer = String(d.answer ?? '')
      s.shown++
      for (const [choice, n] of Object.entries(split)) {
        if (typeof n !== 'number') continue
        s.answered += n
        if (choice === answer) s.correct += n
        else if (choice === 'unknown') s.unknown += n
        else s.wrong[choice] = (s.wrong[choice] ?? 0) + n
      }
    } else if (row.type === 'statement_replaced') {
      if (d.why === 'skip') s.skips++
      else s.allUnknown++
    } else if (row.type === 'report') {
      const reason = (REASONS as readonly string[]).includes(String(d.reason))
        ? (d.reason as Reason)
        : 'none'
      s.reports[reason]++
    }
  }

  const out: StatementStats[] = []
  for (const { wrong, ...s } of stats.values()) {
    const top = Object.entries(wrong).sort((a, b) => b[1] - a[1])[0]
    s.topWrong = top ? { culture: top[0], count: top[1] } : null
    ;[s.flag, s.flagWhy] = flagFor(s)
    out.push(s)
  }
  return out.sort(compare)
}

export const totalReports = (s: StatementStats) => REASONS.reduce((n, r) => n + s.reports[r], 0)
export const withReason = (s: StatementStats) => totalReports(s) - s.reports.none
export const pctCorrect = (s: StatementStats) => (s.answered ? s.correct / s.answered : null)
export const reportRate = (s: StatementStats) => (s.shown ? totalReports(s) / s.shown : null)

function flagFor(s: StatementStats): [Flag, string] {
  const t = THRESHOLDS
  if (s.reports.offensive) return ['action', 'Reported as offensive']
  const rate = reportRate(s)
  if (withReason(s) >= t.reports) return ['review', `${withReason(s)} reports with a reason`]
  if (rate !== null && s.shown >= t.minShown && rate >= t.reportRate) {
    return ['review', `Reported in ${Math.round(rate * 100)}% of showings`]
  }
  const correct = pctCorrect(s)
  if (!s.info?.reviewed && s.shown >= t.minShown && correct !== null) {
    if (correct < t.lowCorrect && s.topWrong && s.topWrong.count >= s.answered / 2) {
      return ['watch', `Few correct; most picked ${s.topWrong.culture}. Missing from fits?`]
    }
    if (correct > t.highCorrect) return ['watch', 'Almost everyone gets it: too obvious?']
  }
  if (s.reports.not_unique && s.topWrong) {
    return ['watch', `"Not unique" and ${s.topWrong.culture} picked instead: widen fits?`]
  }
  return [null, '']
}

const FLAG_ORDER: Record<string, number> = { action: 0, review: 1, watch: 2, null: 3 }

function compare(a: StatementStats, b: StatementStats) {
  return (
    FLAG_ORDER[String(a.flag)] - FLAG_ORDER[String(b.flag)] ||
    totalReports(b) - totalReports(a) ||
    b.shown - a.shown ||
    a.id.localeCompare(b.id)
  )
}

/** Hold health: how much reports pause games, from report events and games started. */
export interface HoldHealth {
  games: number
  gamesWithReports: number
  /** Games by number of reports: 1, 2–3, 4+. */
  buckets: { one: number; few: number; many: number }
  reports: number
  medianHoldMs: number | null
  /** Games where one player reported 4+ times. */
  gamesWithHeavyReporter: number
  /** Total hold time per game with reports: median, in ms. */
  medianGameHoldMs: number | null
  noReasonShare: number | null
}

export function holdHealth(
  games: number,
  reports: { gameId: string; heldMs: number | null; nth: number | null; reason: string }[],
): HoldHealth {
  const perGame = new Map<string, { n: number; held: number; maxNth: number }>()
  for (const r of reports) {
    const g = perGame.get(r.gameId) ?? { n: 0, held: 0, maxNth: 0 }
    g.n++
    g.held += r.heldMs ?? 0
    g.maxNth = Math.max(g.maxNth, r.nth ?? 1)
    perGame.set(r.gameId, g)
  }
  const values = [...perGame.values()]
  const holds = reports.map((r) => r.heldMs).filter((h): h is number => h !== null)
  return {
    games,
    gamesWithReports: values.length,
    buckets: {
      one: values.filter((g) => g.n === 1).length,
      few: values.filter((g) => g.n >= 2 && g.n <= 3).length,
      many: values.filter((g) => g.n >= 4).length,
    },
    reports: reports.length,
    medianHoldMs: median(holds),
    gamesWithHeavyReporter: values.filter((g) => g.maxNth >= 4).length,
    medianGameHoldMs: median(values.map((g) => g.held)),
    noReasonShare: reports.length
      ? reports.filter((r) => r.reason === 'none').length / reports.length
      : null,
  }
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** The review queue as CSV, to open next to content/statements-extended.csv. */
export function statementsCsv(rows: StatementStats[]): string {
  const header = [
    'id',
    'flag',
    'why',
    'culture',
    'topic',
    'reviewed',
    'shown',
    'pct_correct',
    'picked_instead',
    'picked_instead_count',
    'reports',
    ...REASONS.map((r) => `reports_${r}`),
    'skips',
    'all_unknown',
    'older_wording_events',
    'fits',
    'text',
  ]
  const lines = rows.map((s) => {
    const correct = pctCorrect(s)
    return [
      s.id,
      s.flag ?? '',
      s.flagWhy,
      s.culture,
      s.info?.topic ?? '',
      s.info ? (s.info.reviewed ? 'yes' : 'no') : '',
      s.shown,
      correct === null ? '' : Math.round(correct * 100),
      s.topWrong?.culture ?? '',
      s.topWrong?.count ?? '',
      totalReports(s),
      ...REASONS.map((r) => s.reports[r]),
      s.skips,
      s.allUnknown,
      s.olderWording,
      s.info?.fits.join(' ') ?? '',
      s.info?.text ?? '',
    ]
  })
  return [header, ...lines].map((cells) => cells.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

function csvCell(value: unknown): string {
  let text = String(value)
  // Stop spreadsheets from running a cell as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
