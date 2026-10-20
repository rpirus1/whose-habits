// What a guest's screen says while the host is silent. Kept apart from the hook so it can be tested.

export type GuestStatus =
  | 'connecting'
  /** Connected, no answer from a host yet. */
  | 'joining'
  | 'in'
  /** No host answered for a while, and we've never heard from one: wrong link, or no host. */
  | 'notFound'
  /** We've played in this room before, but its host isn't answering (phone locked, app closed). */
  | 'hostAway'
  | 'full'
  | 'kicked'

/**
 * The status after a while with no reply from the host. A guest who already knows the host
 * (rejoining from Home or after a refresh) has the right link, so "check the link" would be wrong.
 */
export function statusWithoutReply(prev: GuestStatus, knowsHost: boolean): GuestStatus {
  if (prev !== 'joining' && prev !== 'connecting') return prev
  return knowsHost ? 'hostAway' : 'notFound'
}
