// Shared by the lander's join form and the Worker's /join redirect (the form's no-JS path),
// so relative imports only.
import { normalizeRoomCode } from '../game/roomCode'

/**
 * While someone types a code by hand: lowercase, dashes between groups of four, at most 12
 * characters ("k7m2x9" → "k7m2-x9"). Anything with a slash or colon is a pasted link: left as is.
 */
export function formatTypedCode(value: string): string {
  if (/[/:]/.test(value)) return value
  const raw = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  return raw.match(/.{1,4}/g)?.join('-') ?? ''
}

/** A typed room code or a pasted room link → the canonical code, or null. */
export function parseJoinInput(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const fromLink = input.match(/\/r\/([^/?#\s]+)/)
  return normalizeRoomCode(fromLink ? fromLink[1] : input.trim())
}
