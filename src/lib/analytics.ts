// Anonymous product events: no names, no ids that identify a person, no cookies.
// Step 7 sends these to a Cloudflare Pages Function; until then they only log in dev.

export type PlayAgainVote = 'yes' | 'maybe' | 'no'

export type AnalyticsEvent =
  | { type: 'play_again_vote'; gameId: string; vote: PlayAgainVote; role: 'host' | 'guest' }
  /** A guest tapped "Host your own game" on the final screen (guest → host conversion). */
  | { type: 'host_cta_click'; gameId: string }
  | { type: 'share_click'; gameId: string; role: 'host' | 'guest' }

export function track(event: AnalyticsEvent) {
  if (import.meta.env.DEV) console.debug('[track]', event)
}
