// Guest ↔ host clock offset, so every phone counts down to the same moment.
// The host sends absolute deadlines in its own clock; a guest converts with
// localTime = hostTime - offset.

export interface ClockSample {
  /** Guest clock when the ping was sent. */
  t0: number
  /** Host clock when it answered. */
  hostNow: number
  /** Guest clock when the pong arrived. */
  t1: number
}

/** offset = host clock - guest clock, from the sample with the shortest round trip. */
export function estimateOffset(samples: readonly ClockSample[]): number | null {
  if (!samples.length) return null
  const best = samples.reduce((a, b) => (b.t1 - b.t0 < a.t1 - a.t0 ? b : a))
  // Assume the host answered halfway through the round trip.
  return Math.round(best.hostNow - (best.t0 + best.t1) / 2)
}

export const CLOCK_SAMPLES = 5
export const CLOCK_SAMPLE_GAP_MS = 300
