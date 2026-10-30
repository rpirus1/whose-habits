// The Dashboard: the signals that decide the product's direction (completed games, which group
// sizes work, picked vs random countries, would/did people play again, guest → host), games per calendar week, and the lander
// and join funnels. Computed in JS from one filtered query (pure, tested); the detailed
// metrics.sql tables follow under "All numbers". Days and weeks are Amsterdam time.
import { escape, renderSections, renderTable, type Filters, type QueryResult } from './page'
import { addDays, localDay, mondayOf, weekLabel } from './time'

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

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

/** Answers to "Would you play again?" against everyone who saw the final screen. */
export interface PlayAgain {
  /** Players on the final screen (connected when the game ended). */
  players: number
  yes: number
  maybe: number
  no: number
  /** Players who didn't vote (never below 0). */
  none: number
}

export interface SizeRow {
  players: number
  started: number
  completed: number
  /** "Yes" votes and players on the final screen, in completed games of this size. */
  yes: number
  atFinal: number
}

/** Games where the host picked the countries vs random countries each round. */
export type GameMode = 'pick' | 'random'

export interface ModeRow {
  started: number
  completed: number
  endedEarly: number
  notFinished: number
  /** "Yes" votes and players on the final screen, in completed games. */
  yes: number
  atFinal: number
}

export interface WeekRow {
  /** Monday, YYYY-MM-DD. */
  week: string
  completed: number
  /** Started that week but not played to the last round. */
  other: number
}

/** Started and completed games for one setting value (rounds, seconds, number of countries). */
export interface SettingRow {
  value: number
  started: number
  completed: number
}

/** The host's settings, where games ended early, and who left mid-game. */
export interface SetupNumbers {
  rounds: SettingRow[]
  seconds: SettingRow[]
  /** Countries per game, picked games only (random games send no countries). */
  countries: SettingRow[]
  /** How often each country was picked, most first (picked games only). */
  topCountries: { culture: string; games: number }[]
  /** Games ended early, by rounds played out of the total. */
  stoppedAt: { roundsPlayed: number; totalRounds: number; games: number }[]
  /** Completed games: players at the start, and how many of them were gone by the end. */
  leftMidGame: { atStart: number; left: number }
}

export interface DashboardNumbers {
  started: number
  /** All rounds played. */
  completed: number
  endedEarly: number
  /** Started, but no final screen reached (host left or closed the game). */
  notFinished: number
  completed5: number
  playAgain: { full: PlayAgain; early: PlayAgain }
  sizes: SizeRow[]
  modes: Record<GameMode, ModeRow>
  finished: number
  replays: number
  ctaTaps: number
  roomsFromCta: number
  shares: number
  sharesByRole: { host: number; guest: number }
  /** Play-again votes by who voted, against all games that reached the final screen. */
  votesByRole: Record<'host' | 'guest', { yes: number; maybe: number; no: number }>
  setup: SetupNumbers
  lander: {
    host: number
    /** "Host a game" taps per button. */
    hostButtons: { header: number; hero: number; footer: number }
    joinCode: number
    rejoin: number
    roomsFromLander: number
  }
  join: { opened: number; named: number; joined: number; final: number; missing: number }
  weeks: WeekRow[]
}

const parse = (data: string): Record<string, unknown> => {
  try {
    return JSON.parse(data) as Record<string, unknown>
  } catch {
    return {}
  }
}

const emptyPlayAgain = (): PlayAgain => ({ players: 0, yes: 0, maybe: 0, no: 0, none: 0 })

export function dashboardNumbers(
  rows: DashboardRow[],
  range: { now: Date; filters: Filters },
): DashboardNumbers {
  const started = new Map<
    string,
    {
      players: number
      replay: boolean
      source: string
      mode: GameMode
      day: string
      rounds: number
      seconds: number
      cultures: string[]
    }
  >()
  const finished = new Map<
    string,
    { atEnd: number; early: boolean; atStart: number; roundsPlayed: number; totalRounds: number }
  >()
  const votes = new Map<string, { yes: number; maybe: number; no: number }>()
  const n = {
    ctaTaps: 0,
    shares: 0,
    sharesByRole: { host: 0, guest: 0 },
    votesByRole: {
      host: { yes: 0, maybe: 0, no: 0 },
      guest: { yes: 0, maybe: 0, no: 0 },
    },
    host: 0,
    hostButtons: { header: 0, hero: 0, footer: 0 },
    joinCode: 0,
    rejoin: 0,
    join: { opened: 0, named: 0, joined: 0, final: 0, missing: 0 },
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
            // Builds before random mode sent no mode: those games were all picked.
            mode: d.mode === 'random' ? 'random' : 'pick',
            day: localDay(row.created_at),
            rounds: Number(d.rounds) || 0,
            seconds: Number(d.seconds) || 0,
            cultures: Array.isArray(d.cultures) ? d.cultures.map(String) : [],
          })
        }
        break
      case 'game_finished':
        finished.set(row.game_id, {
          atEnd: Number(d.playersAtEnd) || 0,
          early: d.endedEarly === true,
          atStart: Number(d.playersAtStart) || 0,
          roundsPlayed: Number(d.roundsPlayed) || 0,
          totalRounds: Number(d.totalRounds) || 0,
        })
        break
      case 'play_again_vote': {
        const v = votes.get(row.game_id) ?? { yes: 0, maybe: 0, no: 0 }
        if (d.vote === 'yes' || d.vote === 'maybe' || d.vote === 'no') {
          v[d.vote]++
          if (d.role === 'host' || d.role === 'guest') n.votesByRole[d.role][d.vote]++
        }
        votes.set(row.game_id, v)
        break
      }
      case 'host_cta_click':
        n.ctaTaps++
        break
      case 'share_click':
        n.shares++
        if (d.role === 'host' || d.role === 'guest') n.sharesByRole[d.role]++
        break
      case 'lander_click':
        if (d.target === 'host_header') n.hostButtons.header++
        else if (d.target === 'host_hero') n.hostButtons.hero++
        else if (d.target === 'host_footer') n.hostButtons.footer++
        if (String(d.target).startsWith('host_')) n.host++
        else if (d.target === 'join_code') n.joinCode++
        else if (d.target === 'rejoin') n.rejoin++
        break
      case 'join_step':
        if (
          d.step === 'opened' ||
          d.step === 'named' ||
          d.step === 'joined' ||
          d.step === 'final' ||
          d.step === 'missing'
        ) {
          n.join[d.step]++
        }
        break
    }
  }

  const isCompleted = (id: string) => finished.get(id)?.early === false
  const games = [...started.entries()]

  // Would play again: everyone on the final screen, split by how the game ended.
  const playAgain = { full: emptyPlayAgain(), early: emptyPlayAgain() }
  for (const [id, f] of finished) {
    const group = f.early ? playAgain.early : playAgain.full
    const v = votes.get(id) ?? { yes: 0, maybe: 0, no: 0 }
    group.players += f.atEnd
    group.yes += v.yes
    group.maybe += v.maybe
    group.no += v.no
  }
  for (const g of [playAgain.full, playAgain.early]) {
    // A vote can come from someone who dropped just before the end: never count more voters than players.
    g.players = Math.max(g.players, g.yes + g.maybe + g.no)
    g.none = g.players - g.yes - g.maybe - g.no
  }

  const sizes: SizeRow[] = []
  for (let p = MIN_PLAYERS; p <= MAX_PLAYERS; p++) {
    const ofSize = games.filter(([, g]) => g.players === p)
    const done = ofSize.filter(([id]) => isCompleted(id))
    sizes.push({
      players: p,
      started: ofSize.length,
      completed: done.length,
      yes: done.reduce((s, [id]) => s + (votes.get(id)?.yes ?? 0), 0),
      atFinal: done.reduce((s, [id]) => s + (finished.get(id)?.atEnd ?? 0), 0),
    })
  }

  const modes = {} as Record<GameMode, ModeRow>
  for (const mode of ['pick', 'random'] as const) {
    const ofMode = games.filter(([, g]) => g.mode === mode)
    const done = ofMode.filter(([id]) => isCompleted(id))
    modes[mode] = {
      started: ofMode.length,
      completed: done.length,
      endedEarly: ofMode.filter(([id]) => finished.get(id)?.early === true).length,
      notFinished: ofMode.filter(([id]) => !finished.has(id)).length,
      yes: done.reduce((s, [id]) => s + (votes.get(id)?.yes ?? 0), 0),
      atFinal: done.reduce((s, [id]) => s + (finished.get(id)?.atEnd ?? 0), 0),
    }
  }

  return {
    started: games.length,
    completed: games.filter(([id]) => isCompleted(id)).length,
    endedEarly: games.filter(([id]) => finished.get(id)?.early === true).length,
    notFinished: games.filter(([id]) => !finished.has(id)).length,
    completed5: games.filter(([id, g]) => isCompleted(id) && g.players >= 5).length,
    playAgain,
    sizes,
    modes,
    finished: finished.size,
    replays: games.filter(([, g]) => g.replay).length,
    ctaTaps: n.ctaTaps,
    roomsFromCta: games.filter(([, g]) => g.source === 'guest_cta' && !g.replay).length,
    shares: n.shares,
    sharesByRole: n.sharesByRole,
    votesByRole: n.votesByRole,
    setup: setupNumbers(games, finished, isCompleted),
    lander: {
      host: n.host,
      hostButtons: n.hostButtons,
      joinCode: n.joinCode,
      rejoin: n.rejoin,
      roomsFromLander: games.filter(([, g]) => g.source === 'lander' && !g.replay).length,
    },
    join: n.join,
    weeks: calendarWeeks(games, isCompleted, range),
  }
}

function setupNumbers(
  games: [string, { mode: GameMode; rounds: number; seconds: number; cultures: string[] }][],
  finished: Map<
    string,
    { early: boolean; atStart: number; atEnd: number; roundsPlayed: number; totalRounds: number }
  >,
  isCompleted: (id: string) => boolean,
): SetupNumbers {
  const bySetting = (pick: (g: (typeof games)[number][1]) => number, ofGames = games) => {
    const rows = new Map<number, SettingRow>()
    for (const [id, g] of ofGames) {
      const value = pick(g)
      if (!value) continue // not sent (malformed or older rows): left out rather than shown as 0
      const row = rows.get(value) ?? { value, started: 0, completed: 0 }
      row.started++
      if (isCompleted(id)) row.completed++
      rows.set(value, row)
    }
    return [...rows.values()].sort((a, b) => a.value - b.value)
  }
  const picked = games.filter(([, g]) => g.mode === 'pick' && g.cultures.length)

  const countryGames = new Map<string, number>()
  for (const [, g] of picked) {
    for (const c of new Set(g.cultures)) countryGames.set(c, (countryGames.get(c) ?? 0) + 1)
  }

  const stopped = new Map<string, SetupNumbers['stoppedAt'][number]>()
  const leftMidGame = { atStart: 0, left: 0 }
  for (const f of finished.values()) {
    if (f.early && f.totalRounds) {
      const key = `${f.roundsPlayed}/${f.totalRounds}`
      const row = stopped.get(key) ?? {
        roundsPlayed: f.roundsPlayed,
        totalRounds: f.totalRounds,
        games: 0,
      }
      row.games++
      stopped.set(key, row)
    } else if (!f.early) {
      leftMidGame.atStart += f.atStart
      // Late joiners can make the end count higher: count leavers per game, never below 0.
      leftMidGame.left += Math.max(0, f.atStart - f.atEnd)
    }
  }

  return {
    rounds: bySetting((g) => g.rounds),
    seconds: bySetting((g) => g.seconds),
    countries: bySetting((g) => g.cultures.length, picked),
    topCountries: [...countryGames]
      .map(([culture, n]) => ({ culture, games: n }))
      .sort((a, b) => b.games - a.games || a.culture.localeCompare(b.culture)),
    stoppedAt: [...stopped.values()].sort(
      (a, b) => a.totalRounds - b.totalRounds || a.roundsPlayed - b.roundsPlayed,
    ),
    leftMidGame,
  }
}

/**
 * Monday–Sunday weeks from the first week in range (the From date, or the first game) to the
 * current week (or the To date). A new week shows up as soon as it starts, even with no games.
 */
function calendarWeeks(
  games: [string, { day: string }][],
  isCompleted: (id: string) => boolean,
  { now, filters }: { now: Date; filters: Filters },
): WeekRow[] {
  const today = localDay(now)
  const days = games.map(([, g]) => g.day).sort()
  const first = filters.from ?? days[0]
  if (!first) return []
  const last = filters.to && filters.to < today ? filters.to : today
  const byWeek = new Map<string, WeekRow>()
  for (let w = mondayOf(first); w <= mondayOf(last); w = addDays(w, 7)) {
    byWeek.set(w, { week: w, completed: 0, other: 0 })
  }
  for (const [id, g] of games) {
    const row = byWeek.get(mondayOf(g.day))
    if (!row) continue
    if (isCompleted(id)) row.completed++
    else row.other++
  }
  return [...byWeek.values()].slice(-26)
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

/** One 100% bar: Yes / Maybe / No / Didn't answer, with % and counts underneath. */
function playAgainBar(title: string, g: PlayAgain): string {
  if (!g.players) {
    return `<div class="stack-block"><div class="stack-title">${escape(title)}</div><p class="empty">No games yet.</p></div>`
  }
  const parts = [
    { key: 'yes', label: 'Yes', n: g.yes },
    { key: 'maybe', label: 'Maybe', n: g.maybe },
    { key: 'no', label: 'No', n: g.no },
    { key: 'none', label: "Didn't answer", n: g.none },
  ]
  const bar = parts
    .filter((p) => p.n)
    .map(
      (p) =>
        `<span class="seg ${p.key}" style="width:${(p.n / g.players) * 100}%" title="${p.label}: ${p.n}"></span>`,
    )
    .join('')
  const legend = parts
    .map(
      (p) =>
        `<span class="key"><span class="dot ${p.key}"></span>${p.label} <strong>${pct(p.n / g.players)}</strong> <span class="hint">(${p.n})</span></span>`,
    )
    .join('')
  return `<div class="stack-block"><div class="stack-title">${escape(title)} <span class="hint">· ${g.players} players on the final screen</span></div><div class="stack" role="img" aria-label="${escape(title)}">${bar}</div><div class="legend">${legend}</div></div>`
}

/** Completed games per group size (2–12), with completion rate and "yes" share under each bar. */
function sizeChart(sizes: SizeRow[]): string {
  if (!sizes.some((s) => s.started)) return '<p class="empty">No games yet.</p>'
  const max = Math.max(1, ...sizes.map((s) => s.completed))
  const colW = 52
  const barW = 30
  const chartH = 110
  const h = chartH + 64
  const width = sizes.length * colW
  const cols = sizes
    .map((s, i) => {
      const x = i * colW
      const cx = x + colW / 2
      const bh = Math.round((s.completed / max) * (chartH - 22))
      const done = s.started ? pct(s.completed / s.started) : '–'
      const yes = s.atFinal ? pct(s.yes / s.atFinal) : '–'
      return `<g><title>${s.players} players: ${s.completed} completed of ${s.started} started · ${yes} said yes</title>
<rect class="bar" x="${cx - barW / 2}" y="${chartH - bh}" width="${barW}" height="${bh}" rx="3"></rect>
<text x="${cx}" y="${chartH - bh - 5}" text-anchor="middle" class="num">${s.completed || ''}</text>
<text x="${cx}" y="${chartH + 16}" text-anchor="middle" class="axis">${s.players}</text>
<text x="${cx}" y="${chartH + 36}" text-anchor="middle">${done}</text>
<text x="${cx}" y="${chartH + 54}" text-anchor="middle">${yes}</text></g>`
    })
    .join('')
  return `<div class="scroll"><svg width="${width + 70}" height="${h}" viewBox="-70 0 ${width + 70} ${h}" role="img" aria-label="Completed games by number of players">
<text x="-66" y="${chartH + 16}" class="axis">players</text>
<text x="-66" y="${chartH + 36}">% completed</text>
<text x="-66" y="${chartH + 54}">% said yes</text>
${cols}</svg></div>`
}

/** Picked vs random countries side by side: how games end, and who would play again. */
function modeTable(modes: Record<GameMode, ModeRow>): string {
  if (!modes.pick.started && !modes.random.started) return '<p class="empty">No games yet.</p>'
  const share = (n: number, of: number) => (of ? `${n} (${pct(n / of)})` : `${n}`)
  const row = (label: string, m: ModeRow) => ({
    Countries: label,
    Started: m.started,
    'All rounds played': share(m.completed, m.started),
    'Ended early': share(m.endedEarly, m.started),
    'Not finished': share(m.notFinished, m.started),
    'Said "Yes"': m.atFinal ? `${pct(m.yes / m.atFinal)} of ${m.atFinal}` : '–',
  })
  return renderTable([
    row('Picked by the host', modes.pick),
    row('Random each round', modes.random),
  ])
}

function weeklyChart(weeks: WeekRow[]): string {
  if (!weeks.length) return '<p class="empty">No games yet.</p>'
  const max = Math.max(1, ...weeks.map((w) => w.completed + w.other))
  const colW = 64
  const barW = 36
  const chartH = 120
  const h = chartH + 22
  const width = weeks.length * colW
  const bars = weeks
    .map((w, i) => {
      const cx = i * colW + colW / 2
      const total = w.completed + w.other
      const hc = Math.round((w.completed / max) * (chartH - 22))
      const ho = Math.round((w.other / max) * (chartH - 22))
      return `<g><title>${weekLabel(w.week)}: ${w.completed} completed, ${w.other} not completed</title>
<rect class="bar" x="${cx - barW / 2}" y="${chartH - hc}" width="${barW}" height="${hc}"></rect>
<rect class="bar-other" x="${cx - barW / 2}" y="${chartH - hc - ho}" width="${barW}" height="${ho}"></rect>
<text x="${cx}" y="${chartH - hc - ho - 5}" text-anchor="middle" class="num">${total || ''}</text>
<text x="${cx}" y="${chartH + 16}" text-anchor="middle">${weekLabel(w.week)}</text></g>`
    })
    .join('')
  return `<div class="legend"><span class="key"><span class="dot yes-bar"></span>All rounds played</span><span class="key"><span class="dot other-bar"></span>Ended early or not finished</span></div>
<div class="scroll"><svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img" aria-label="Games per calendar week">${bars}</svg></div>`
}

/** Settings tables: games started and completed per value, and where early games stopped. */
const roleVotes = (v: { yes: number; maybe: number; no: number }) =>
  `${v.yes} yes, ${v.maybe} maybe, ${v.no} no`

function setupSection(s: SetupNumbers): string {
  const rows = (label: string, list: SettingRow[], unit: string) =>
    list.map((r) => ({
      Setting: label,
      Value: `${r.value}${unit}`,
      Started: r.started,
      'All rounds played': `${r.completed} (${pct(ratio(r.completed, r.started))})`,
    }))
  const settings = [
    ...rows('Rounds', s.rounds, ''),
    ...rows('Time to answer', s.seconds, ' s'),
    ...rows('Countries (picked games)', s.countries, ''),
  ]
  const top = s.topCountries.length
    ? s.topCountries.map((c) => `${escape(c.culture)} ${c.games}`).join(' · ')
    : 'no picked games yet'
  const stopped = s.stoppedAt.map((r) => ({
    'Stopped after round': `${r.roundsPlayed} of ${r.totalRounds}`,
    Games: r.games,
  }))
  const left = s.leftMidGame
  return `${renderTable(settings)}
<p class="hint">Most picked countries (games): ${top}.</p>
<h3>Where games ended early</h3>
${renderTable(stopped)}
<p class="hint">Players who left during games with all rounds played: ${left.left} of ${left.atStart} who started (${pct(ratio(left.left, left.atStart))}).</p>`
}

export function renderDashboardBody(d: DashboardNumbers, details: QueryResult[]): string {
  const tiles = [
    tile(
      'Completed games',
      `${d.completed}`,
      `all rounds played · ${d.endedEarly} ended early · ${d.notFinished} not finished · ${d.started} started<br>5+ players: ${d.completed5} (target 3)`,
      d.completed5 >= 3 ? 'ok' : '',
    ),
    tile(
      'Actually played again',
      pct(ratio(d.replays, d.finished)),
      `${d.replays} replays after ${d.finished} games that reached the final screen`,
    ),
    tile(
      'Guest → host',
      `${d.roomsFromCta}`,
      `rooms started after ${d.ctaTaps} "Host your own game" taps · ${d.shares} shares (${d.sharesByRole.host} by hosts, ${d.sharesByRole.guest} by guests)`,
    ),
  ].join('')

  return `<h2>Success signals</h2>
<div class="tiles">${tiles}</div>
<h2>Would you play again?</h2>
<p class="hint">100% = every player on the final screen, host included. Games ended early are shown apart: people may have stopped because they didn't like it.</p>
${playAgainBar('All rounds played', d.playAgain.full)}
${playAgainBar('Ended early', d.playAgain.early)}
<p class="hint">Votes by who voted: hosts ${roleVotes(d.votesByRole.host)} · guests ${roleVotes(d.votesByRole.guest)}.</p>
<h2>Completed games by group size</h2>
<p class="hint">Bars: games with all rounds played. Under each: share of started games that were completed, and share of players on the final screen who said "Yes" to playing again. Which group size the game suits best.</p>
${sizeChart(d.sizes)}
<h2>Picked vs random countries</h2>
<p class="hint">Shares are of started games. "Said Yes": players on the final screen of games with all rounds played who said "Yes" to playing again. Games from before random mode count as picked.</p>
${modeTable(d.modes)}
<h2>Game settings</h2>
<p class="hint">The host's choices, and which ones get played to the end. Random games send no countries, so they're left out of the country rows.</p>
${setupSection(d.setup)}
<h2>Games per week</h2>
${weeklyChart(d.weeks)}
<h2>Lander → game</h2>
<p class="hint">Visits and referrers come from Cloudflare Web Analytics (in the Cloudflare dashboard), not from here.</p>
${funnel([
  { label: '"Host a game" taps', n: d.lander.host },
  { label: 'games started from the lander', n: d.lander.roomsFromLander },
])}
<p class="hint">"Host a game" taps by button: header ${d.lander.hostButtons.header} · hero ${d.lander.hostButtons.hero} · footer ${d.lander.hostButtons.footer}.</p>
<p class="hint">Also: ${d.lander.joinCode} joins with a code · ${d.lander.rejoin} "Back to the last game" taps.</p>
<h2>Guests joining</h2>
<p class="hint">Guests who opened a room link on a device that hadn't joined that room before.</p>
${funnel([
  { label: 'opened the link', n: d.join.opened },
  { label: 'entered a name', n: d.join.named },
  { label: 'got in', n: d.join.joined },
  { label: 'reached the final screen', n: d.join.final },
])}
<p class="hint">Also: ${d.join.missing} opened a code with no game running (mistyped, or the host's phone was off).</p>
<details><summary>All numbers (the metrics.sql tables)</summary>${renderSections(details)}</details>`
}
