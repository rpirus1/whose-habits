import { describe, expect, it } from 'vitest'
import { dayStartUtc, formatDay, localDateTime, localDay, mondayOf, weekLabel } from './time'

describe('Amsterdam time', () => {
  it('finds the Amsterdam day of a UTC moment', () => {
    expect(localDay('2026-10-19T22:30:00Z')).toBe('2026-10-20') // 00:30 CEST
    expect(localDay('2026-10-26T22:30:00Z')).toBe('2026-10-26') // 23:30 CET
  })

  it('starts a day at Amsterdam midnight, in summer and in winter time', () => {
    expect(dayStartUtc('2026-10-01')).toBe('2026-09-30T22:00:00.000Z')
    expect(dayStartUtc('2026-11-01')).toBe('2026-10-31T23:00:00.000Z')
  })

  it('shows dates as DD/MM/YYYY', () => {
    expect(formatDay('2026-10-23')).toBe('23/10/2026')
    expect(localDateTime(new Date('2026-10-23T09:38:00Z'))).toBe('23/10/2026 11:38')
  })

  it('labels Monday–Sunday weeks', () => {
    expect(mondayOf('2026-10-25')).toBe('2026-10-19')
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
    expect(weekLabel('2026-10-19')).toBe('19–25.10')
    expect(weekLabel('2026-10-26')).toBe('26.10–1.11')
  })
})
