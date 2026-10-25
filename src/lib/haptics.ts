// Short vibrations on Android (Chrome, Firefox, Samsung Internet). iOS Safari has no
// Vibration API, so there it does nothing. Browsers ignore it until the person has tapped the
// page once, which every player has by the time any of these fire.

const PATTERNS = {
  /** Picking an answer. */
  tap: 10,
  /** A light heads-up: someone joined, the Next countdown started. */
  notice: 15,
  correct: [20, 60, 30],
  /** Correct and fastest: one beat more. */
  bonus: [20, 60, 20, 60, 40],
} satisfies Record<string, VibratePattern>

export function haptic(kind: keyof typeof PATTERNS) {
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    // Some in-app browsers throw instead of ignoring it.
  }
}
