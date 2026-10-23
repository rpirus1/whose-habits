// The Dashboard: the brief's success signals as tiles, games per week, and the lander and join
// funnels. Computed in JS from one filtered query (pure, tested); the detailed metrics.sql
// tables follow under "All numbers".
import { addDays, escape, renderSections, type QueryResult } from './page'

/** Every event the dashboard needs. `test = 0` is swapped for the page filters (filterSql). */
export const DASHBOARD_SQL = `SELECT type, game_id, data, created_at FROM events
WHERE type IN ('game_started', 'game_finished', 'play_again_vote', 'host_cta_click',
  'share_click', 'lander_click', 'join_step') AND test = 0`

export interface DashboardRow {
  type: string
  game_id: string
  data: string
  created_at: string
}

export interface DashboardNumbers {
  games: number
  games5: number
  avgPlayers: number | null
  completed: number
  /** Median per-game share of starting players still there at the last round. */
  medianFinish: number | null
  games80: number
  votes: number
  yes: number
  finished: number
  replays: number
  ctaTaps: number
  roomsFromCta: number
  shares: number
  lander: { host: number; joinCode: number; rejoin: number; roomsFromLander: number }
  join: { opened: number; named: number; joined: number; final: number }
  /** Games started per week (Monday, UTC), oldest first. */
  weeks: { week: string; games: number }[]
}

const parse = (data: string): Record<string, unknown> => {
  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function dashboardNumbers(rows: DashboardRow[]): DashboardNumbers {
  const started = new Map<
    string,
    { players: number; replay: boolean; source: string; at: string }
  >()
  const finished = new Map<string, { atEnd: number; early: boolean }>()
  const n = {
    votes: 0,
    yes: 0,
    ctaTaps: 0,
    shares: 0,
    host: 0,
    joinCode: 0,
    rejoin: 0,
    join: { opened: 0, named: 0, joined: 0, final: 0 },
  }
  for (const row of rows) {
    const d = parse(row.data)
    switch (row.type) {
      case 'game_started':
        if (!started.has(row.game_id)) {
          started.set(row.game_id, {
            players: Number(d.players) || 0,
            replay: d.replay === true,
            source: String(d.source ?? 'direct'),
            at: row.created_at,
          })
        }
        break
      case 'game_finished':
        finished.set(row.game_id, {
          atEnd: Number(d.playersAtEnd) || 0,
          early: d.endedEarly === true,
        })
        break
      case 'play_again_vote':
        n.votes++
        if (d.vote === 'yes') n.yes++
        break
      case 'host_cta_click':
        n.ctaTaps++
        break
      case 'share_click':
        n.shares++
        break
      case 'lander_click':
        if (String(d.target).startsWith('host_')) n.host++
        else if (d.target === 'join_code') n.joinCode++
        else if (d.target === 'rejoin') n.rejoin++
        break
      case 'join_step':
        if (
          d.step === 'opened' ||
          d.step === 'named' ||
          d.step === 'joined' ||
          d.step === 'final'
        ) {
          n.join[d.step]++
        }
        break
    }
  }

  const games = [...started.entries()]
  const rates = games
    .filter(([, g]) => g.players > 0)
    .map(([id, g]) => {
      const f = finished.get(id)
      return f && !f.early ? Math.min(1, f.atEnd / g.players) : 0
    })
  const weekly = new Map<string, number>()
  for (const [, g] of games) {
    const week = mondayOf(g.at.slice(0, 10))
    weekly.set(week, (weekly.get(week) ?? 0) + 1)
  }

  return {
    games: games.length,
    games5: games.filter(([, g]) => g.players >= 5).length,
    avgPlayers: games.length ? games.reduce((s, [, g]) => s + g.players, 0) / games.length : null,
    completed: games.filter(([id]) => finished.get(id)?.early === false).length,
    medianFinish: median(rates),
    games80: rates.filter((r) => r >= 0.8).length,
    votes: n.votes,
    yes: n.yes,
    finished: finished.size,
    replays: games.filter(([, g]) => g.replay).length,
    ctaTaps: n.ctaTaps,
    roomsFromCta: games.filter(([, g]) => g.source === 'guest_cta' && !g.replay).length,
    shares: n.shares,
    lander: {
      host: n.host,
      joinCode: n.joinCode,
      rejoin: n.rejoin,
      roomsFromLander: games.filter(([, g]) => g.source === 'lander' && !g.replay).length,
    },
    join: n.join,
    weeks: fillWeeks(weekly),
  }
}

function mondayOf(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7 // Monday = 0
  return addDays(day, -weekday)
}

/** Every week from the first one with games to the last, so gaps show as empty bars. */
function fillWeeks(weekly: Map<string, number>): { week: string; games: number }[] {
  const weeks = [...weekly.keys()].sort()
  if (!weeks.length) return []
  const out = []
  for (let w = weeks[0]!; w <= weeks.at(-1)!; w = addDays(w, 7)) {
    out.push({ week: w, games: weekly.get(w) ?? 0 })
  }
  return out.slice(-26)
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`)
const ratio = (a: number, b: number) => (b ? a / b : null)

function tile(label: string, value: string, sub: string, state: 'ok' | 'warn' | '' = '') {
  return `<div class="tile${state ? ` ${state}` : ''}"><div class="label">${escape(label)}</div><div class="value">${escape(value)}</div><div class="sub">${sub}</div></div>`
}

function funnel(steps: { label: string; n: number }[]): string {
  return `<div class="funnel">${steps
    .map((s, i) => {
      const prev = i ? steps[i - 1]!.n : null
      const conv = prev ? `${pct(s.n / prev)} of previous` : '&nbsp;'
      return `${i ? '<span class="arrow" aria-hidden="true">→</span>' : ''}<div class="step"><div class="n">${s.n}</div><div class="label">${escape(s.label)}</div><div class="pct">${conv}</div></div>`
    })
    .join('')}</div>`
}

function weeklyChart(weeks: { week: string; games: number }[]): string {
  if (!weeks.length) return '<p class="empty">No games yet.</p>'
  const max = Math.max(1, ...weeks.map((w) => w.games))
  const barW = 28
  const gap = 8
  const h = 120
  const width = weeks.length * (barW + gap)
  const bars = weeks
    .map((w, i) => {
      const bh = Math.round((w.games / max) * (h - 30))
      const x = i * (barW + gap)
      return `<g><title>Week of ${w.week}: ${w.games} games</title><rect class="bar" x="${x}" y="${h - 18 - bh}" width="${barW}" height="${bh}" rx="3"></rect><text x="${x + barW / 2}" y="${h - 22 - bh}" text-anchor="middle">${w.games || ''}</text><text x="${x + barW / 2}" y="${h - 4}" text-anchor="middle">${w.week.slice(5)}</text></g>`
    })
    .join('')
  return `<div class="scroll"><svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img" aria-label="Games started per week">${bars}</svg></div>`
}

export function renderDashboardBody(d: DashboardNumbers, details: QueryResult[]): string {
  const finish = d.medianFinish
  const tiles = [
    tile(
      'Sessions with 5+ players',
      `${d.games5}`,
      `target 3 · of ${d.games} games · avg ${d.avgPlayers === null ? '–' : d.avgPlayers.toFixed(1)} players`,
      d.games5 >= 3 ? 'ok' : '',
    ),
    tile(
      'Players who finish (median game)',
      pct(finish),
      `target 80% · ${d.games80} of ${d.games} games at 80%+ · ${d.completed} games completed`,
      finish === null ? '' : finish >= 0.8 ? 'ok' : 'warn',
    ),
    tile('Would play again', pct(ratio(d.yes, d.votes)), `"yes" of ${d.votes} votes`),
    tile(
      'Actually played again',
      pct(ratio(d.replays, d.finished)),
      `${d.replays} replays after ${d.finished} finished games`,
    ),
    tile(
      'Guest → host',
      `${d.roomsFromCta}`,
      `rooms started after ${d.ctaTaps} "Host your own game" taps · ${d.shares} shares`,
    ),
  ].join('')

  return `<h2>Success signals</h2>
<div class="tiles">${tiles}</div>
<h2>Games per week</h2>
${weeklyChart(d.weeks)}
<h2>Lander → game</h2>
<p class="hint">Visits and referrers come from Cloudflare Web Analytics (in the Cloudflare dashboard), not from here.</p>
${funnel([
  { label: '"Host a game" taps', n: d.lander.host },
  { label: 'games started from the lander', n: d.lander.roomsFromLander },
])}
<p class="hint">Also: ${d.lander.joinCode} joins with a code · ${d.lander.rejoin} "Back to the last game" taps.</p>
<h2>Guests joining</h2>
<p class="hint">Guests who opened a room link on a device that hadn't joined that room before.</p>
${funnel([
  { label: 'opened the link', n: d.join.opened },
  { label: 'entered a name', n: d.join.named },
  { label: 'got in', n: d.join.joined },
  { label: 'reached the final screen', n: d.join.final },
])}
<details><summary>All numbers (the metrics.sql tables)</summary>${renderSections(details)}</details>`
}
