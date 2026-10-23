// The Statements page: what players flagged and how each statement plays, to fix rows in the CSV.
import { escape, filterQuery } from './page'
import type { Filters } from './page'
import {
  pctCorrect,
  REASONS,
  reportRate,
  THRESHOLDS,
  totalReports,
  type HoldHealth,
  type StatementStats,
} from './statements'

export interface StatementsView {
  culture: string
  topic: string
  /** 'attention' = flagged or reported rows only; 'all' = every row with data. */
  show: 'attention' | 'all'
  unreviewed: boolean
  current: boolean
}

export function parseStatementsView(params: URLSearchParams): StatementsView {
  const culture = params.get('culture') ?? ''
  const topic = params.get('topic') ?? ''
  return {
    culture: /^[A-Z]{2}$/.test(culture) ? culture : '',
    topic: /^[a-z]{2,20}$/.test(topic) ? topic : '',
    show: params.get('show') === 'all' ? 'all' : 'attention',
    unreviewed: params.get('unreviewed') === '1',
    current: params.get('current') === '1',
  }
}

/** URL params that keep this view when the shared filters change. */
export function viewParams(v: StatementsView): Record<string, string> {
  return {
    culture: v.culture,
    topic: v.topic,
    show: v.show === 'all' ? 'all' : '',
    unreviewed: v.unreviewed ? '1' : '',
    current: v.current ? '1' : '',
  }
}

export function selectRows(rows: StatementStats[], v: StatementsView): StatementStats[] {
  return rows.filter(
    (s) =>
      (!v.culture || s.culture === v.culture) &&
      (!v.topic || s.info?.topic === v.topic) &&
      (!v.unreviewed || s.info?.reviewed === false) &&
      (v.show === 'all' || s.flag !== null || totalReports(s) > 0),
  )
}

const REASON_LABELS: Record<(typeof REASONS)[number], string> = {
  incorrect: 'incorrect',
  outdated: 'outdated',
  not_unique: 'not unique',
  offensive: 'offensive',
  none: 'no reason given',
}
const FLAG_LABELS = { action: 'Needs action', review: 'Review', watch: 'Watch' }

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`)
const seconds = (ms: number | null) => (ms === null ? '–' : `${(ms / 1000).toFixed(1)} s`)

export function renderStatementsBody(
  all: StatementStats[],
  view: StatementsView,
  filters: Filters,
  hold: HoldHealth,
  cultures: string[],
  topics: string[],
): string {
  const rows = selectRows(all, view)
  const count = (flag: string) => all.filter((s) => s.flag === flag).length
  const extra = viewParams(view)
  const csvHref = `/statements.csv${filterQuery(filters, extra)}`
  const option = (value: string, label: string, selected: string) =>
    `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`
  const hiddenShared = Object.entries({
    data: filters.scope,
    from: filters.from ?? '',
    to: filters.to ?? '',
  })
    .filter(([, v]) => v)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escape(v)}">`)
    .join('')

  const viewForm = `<form class="filters" method="get" action="/statements">
<div class="fields">
${hiddenShared}
<label>Show <select name="show">${option('attention', 'Needs attention', view.show)}${option('all', 'All with data', view.show)}</select></label>
<label>Culture <select name="culture">${option('', 'All', view.culture)}${cultures.map((c) => option(c, c, view.culture)).join('')}</select></label>
<label>Topic <select name="topic">${option('', 'All', view.topic)}${topics.map((t) => option(t, t, view.topic)).join('')}</select></label>
<label><input type="checkbox" name="unreviewed" value="1"${view.unreviewed ? ' checked' : ''}> Unreviewed only</label>
<label><input type="checkbox" name="current" value="1"${view.current ? ' checked' : ''}> Current wording only</label>
<button type="submit">Show</button>
<a class="button" href="${escape(csvHref)}">Download CSV</a>
</div>
</form>`

  const summary = `<p class="hint">${all.length} statements with data · <strong>${count('action')}</strong> need action · <strong>${count('review')}</strong> to review · <strong>${count('watch')}</strong> to watch. Showing ${rows.length}.
Review at ${THRESHOLDS.reports}+ reports with a reason, or a ${pct(THRESHOLDS.reportRate)}+ report rate after ${THRESHOLDS.minShown}+ showings; any offensive report at once.</p>`

  const table = rows.length
    ? `<div class="scroll"><table><thead><tr><th>Flag</th><th>Statement</th><th>Shown</th><th>Correct</th><th>Picked instead</th><th>Reports</th><th>Skipped</th></tr></thead><tbody>${rows.map(renderRow).join('')}</tbody></table></div>`
    : '<p class="empty">Nothing here for these filters.</p>'

  return `<h2>Statements</h2>
<p class="hint">Fix a row in <code>content/statements-extended.csv</code> (keep the id, note it in <code>comments</code>), widen <code>fits</code>, or delete it (never reuse the id). A changed wording starts its counts again; tick "Current wording only" to hide the old ones.</p>
${viewForm}
${summary}
${table}
${renderBreakdown('By culture', all, (s) => s.culture)}
${renderBreakdown('By topic', all, (s) => s.info?.topic ?? 'unknown')}
${renderHold(hold)}`
}

function renderRow(s: StatementStats): string {
  const flag = s.flag
    ? `<span class="flag ${s.flag}">${FLAG_LABELS[s.flag]}</span><div class="hint">${escape(s.flagWhy)}</div>`
    : ''
  const info = s.info
  const meta = info
    ? `${escape(s.id)} · fits ${escape(info.fits.join(' '))} · ${escape(info.topic)} · ${info.reviewed ? 'reviewed' : '<strong>unreviewed</strong>'}`
    : `${escape(s.id)} · not in the current CSVs`
  const older = s.olderWording
    ? `<div class="hint">${s.olderWording} event(s) on an older wording</div>`
    : ''
  const reports = REASONS.filter((r) => s.reports[r])
    .map((r) => `${s.reports[r]} ${REASON_LABELS[r]}`)
    .join('<br>')
  const rate = reportRate(s)
  const picked = s.topWrong
    ? `${escape(s.topWrong.culture)} · ${s.topWrong.count}${s.answered ? ` (${pct(s.topWrong.count / s.answered)})` : ''}`
    : '–'
  return `<tr>
<td>${flag}</td>
<td class="text">${escape(info?.text ?? '')}<div class="hint">${meta}</div>${older}</td>
<td>${s.shown}</td>
<td>${pct(pctCorrect(s))}${s.unknown ? `<div class="hint">${s.unknown} don't know</div>` : ''}</td>
<td>${picked}</td>
<td>${totalReports(s) ? `<strong>${totalReports(s)}</strong>${rate !== null ? ` <span class="hint">(${pct(rate)})</span>` : ''}<div class="hint">${reports}</div>` : '–'}</td>
<td>${s.skips + s.allUnknown ? `${s.skips} skip · ${s.allUnknown} all "don't know"` : '–'}</td>
</tr>`
}

function renderBreakdown(
  title: string,
  all: StatementStats[],
  key: (s: StatementStats) => string,
): string {
  const groups = new Map<string, StatementStats[]>()
  for (const s of all) groups.set(key(s), [...(groups.get(key(s)) ?? []), s])
  if (!groups.size) return ''
  const rows = [...groups.entries()]
    .map(([name, list]) => {
      const shown = list.reduce((n, s) => n + s.shown, 0)
      const answered = list.reduce((n, s) => n + s.answered, 0)
      const correct = list.reduce((n, s) => n + s.correct, 0)
      const reports = list.reduce((n, s) => n + totalReports(s), 0)
      const notUnique = list.reduce((n, s) => n + s.reports.not_unique, 0)
      return { name, shown, correct: answered ? correct / answered : null, reports, notUnique }
    })
    .sort((a, b) => b.reports - a.reports || b.shown - a.shown)
  return `<h2>${escape(title)}</h2><div class="scroll"><table><thead><tr><th></th><th>Shown</th><th>Correct</th><th>Reports</th><th>Report rate</th><th>"Not unique"</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr><td>${escape(r.name)}</td><td>${r.shown}</td><td>${pct(r.correct)}</td><td>${r.reports}</td><td>${pct(r.shown ? r.reports / r.shown : null)}</td><td>${r.notUnique}</td></tr>`,
    )
    .join('')}</tbody></table></div>`
}

function renderHold(h: HoldHealth): string {
  const heavyShare = h.games ? h.gamesWithHeavyReporter / h.games : null
  const alarm =
    (heavyShare !== null && heavyShare > 0.1) || (h.medianHoldMs !== null && h.medianHoldMs > 6000)
  return `<h2>Report holds</h2>
<p class="hint">Each report pauses the game for up to 10 s. Watch for one player stalling games: more than 10% of games where one player reported 4+ times, or a median hold above 6 s.${alarm ? ' <strong>One of these is over the line.</strong>' : ''}</p>
<div class="tiles">
<div class="tile"><div class="label">Games with reports</div><div class="value">${h.gamesWithReports}</div><div class="sub">of ${h.games} games · 1: ${h.buckets.one} · 2–3: ${h.buckets.few} · 4+: ${h.buckets.many}</div></div>
<div class="tile"><div class="label">Median hold per report</div><div class="value">${seconds(h.medianHoldMs)}</div><div class="sub">${h.reports} reports</div></div>
<div class="tile"><div class="label">Hold per game (median)</div><div class="value">${seconds(h.medianGameHoldMs)}</div><div class="sub">games with reports</div></div>
<div class="tile${heavyShare !== null && heavyShare > 0.1 ? ' warn' : ''}"><div class="label">Games with a 4+ reporter</div><div class="value">${h.gamesWithHeavyReporter}</div><div class="sub">${pct(heavyShare)} of games</div></div>
<div class="tile"><div class="label">No reason given</div><div class="value">${pct(h.noReasonShare)}</div><div class="sub">closed or timed out</div></div>
</div>`
}
