// Dates on the stats pages: days and weeks in Amsterdam time, shown as DD/MM/YYYY.
// Stored events keep UTC timestamps (created_at); these helpers convert at the edges.

const TIME_ZONE = 'Europe/Amsterdam'

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function local(date: Date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map((x) => [x.type, x.value]))
  return { y: p.year!, m: p.month!, d: p.day!, h: p.hour!, min: p.minute! }
}

/** The Amsterdam calendar day (YYYY-MM-DD) of a moment. */
export function localDay(date: Date | string): string {
  const p = local(typeof date === 'string' ? new Date(date) : date)
  return `${p.y}-${p.m}-${p.d}`
}

/** "23/10/2026 11:38", Amsterdam time. */
export function localDateTime(date: Date): string {
  const p = local(date)
  return `${p.d}/${p.m}/${p.y} ${p.h}:${p.min}`
}

/** The UTC moment (ISO, as stored in created_at) when an Amsterdam day starts. */
export function dayStartUtc(day: string): string {
  const guess = Date.parse(`${day}T00:00:00Z`)
  const p = local(new Date(guess))
  const wall = Date.UTC(+p.y, +p.m - 1, +p.d, +p.h, +p.min)
  return new Date(guess - (wall - guess)).toISOString()
}

export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** YYYY-MM-DD → DD/MM/YYYY. */
export const formatDay = (day: string) =>
  `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`

/** The Monday of a day's calendar week. */
export function mondayOf(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7 // Monday = 0
  return addDays(day, -weekday)
}

/** A Monday–Sunday week as "19–25.10", or "26.10–1.11" when it spans two months. */
export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6)
  const d = (day: string) => String(+day.slice(8, 10))
  const m = (day: string) => String(+day.slice(5, 7))
  return monday.slice(5, 7) === sunday.slice(5, 7)
    ? `${d(monday)}–${d(sunday)}.${m(sunday)}`
    : `${d(monday)}.${m(monday)}–${d(sunday)}.${m(sunday)}`
}
