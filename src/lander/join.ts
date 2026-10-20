// Shared by the lander's join form and the Worker's /join redirect (the form's no-JS path),
// so relative imports only.
import { normalizeRoomCode } from '../game/roomCode'

/** A typed room code or a pasted room link → the canonical code, or null. */
export function parseJoinInput(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const fromLink = input.match(/\/r\/([^/?#\s]+)/)
  return normalizeRoomCode(fromLink ? fromLink[1] : input.trim())
}
