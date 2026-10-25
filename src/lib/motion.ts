// Screen transitions, using tw-animate-css (installed with shadcn/ui). Change the feel of
// every screen change here. motion-safe: people who ask their OS for reduced motion get
// none. Enter-only: the old screen disappears at once, the new one eases in.

/** A new screen or phase (lobby, question, reveal, final) fades and rises in. */
export const enterScreen =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-300 motion-safe:ease-out'

/** A highlight inside a screen, e.g. the correct answer at the reveal, pops in a beat later. */
export const enterHighlight =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:duration-300 motion-safe:delay-150 motion-safe:fill-mode-backwards'

/**
 * Something small arriving: a player joining, the countdown pill, the points badge. One style for
 * every new effect, so they read as one family: a quick fade and grow from the centre.
 */
export const popIn =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-300 motion-safe:ease-out'
