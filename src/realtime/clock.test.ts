import { describe, expect, it } from 'vitest'
import { estimateOffset } from './clock'

describe('estimateOffset', () => {
  it('returns null without samples', () => {
    expect(estimateOffset([])).toBeNull()
  })

  it('uses the midpoint of the round trip', () => {
    // Guest clock is 5 s behind the host; 100 ms round trip.
    expect(estimateOffset([{ t0: 1000, hostNow: 6050, t1: 1100 }])).toBe(5000)
  })

  it('trusts the fastest round trip', () => {
    const offset = estimateOffset([
      { t0: 0, hostNow: 5900, t1: 1000 }, // slow, skewed sample
      { t0: 2000, hostNow: 7020, t1: 2040 },
    ])
    expect(offset).toBe(5000)
  })
})
