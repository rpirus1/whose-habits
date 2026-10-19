// One Supabase Realtime channel per room: broadcast for messages, presence for who's online.
//
// supabase-js returns the *same* channel object for the same topic, so connections are shared
// and closed with a short delay. That keeps React StrictMode's mount → unmount → mount
// (and quick screen changes) from tearing the channel down and re-joining it.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { CHANNEL_EVENT, channelName } from '@/game/protocol'
import { getSupabase } from './supabase'

export type ConnectionStatus = 'connecting' | 'connected' | 'error'

type Listener<T> = (value: T) => void

export class RoomConnection {
  readonly roomCode: string
  readonly presenceKey: string
  status: ConnectionStatus = 'connecting'
  onlineIds: string[] = []
  /** False until the first presence sync; before that, onlineIds is not meaningful. */
  presenceSynced = false

  private channel: RealtimeChannel
  private meta: Record<string, unknown> = {}
  private messageListeners = new Set<Listener<unknown>>()
  private presenceListeners = new Set<Listener<string[]>>()
  private statusListeners = new Set<Listener<ConnectionStatus>>()

  constructor(roomCode: string, presenceKey: string) {
    this.roomCode = roomCode
    this.presenceKey = presenceKey
    this.channel = getSupabase().channel(channelName(roomCode), {
      config: { broadcast: { self: false }, presence: { key: presenceKey, enabled: true } },
    })
    this.channel
      .on('broadcast', { event: CHANNEL_EVENT }, ({ payload }) => {
        for (const l of this.messageListeners) l(payload)
      })
      .on('presence', { event: 'sync' }, () => {
        this.onlineIds = Object.keys(this.channel.presenceState())
        this.presenceSynced = true
        for (const l of this.presenceListeners) l(this.onlineIds)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void this.channel.track(this.meta)
          this.setStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // supabase-js keeps retrying; the UI shows "reconnecting" meanwhile.
          this.setStatus('error')
        }
      })
  }

  send(message: object) {
    void this.channel.send({ type: 'broadcast', event: CHANNEL_EVENT, payload: message })
  }

  /** Presence metadata (e.g. name). Re-tracked if already connected. */
  track(meta: Record<string, unknown>) {
    this.meta = meta
    if (this.status === 'connected') void this.channel.track(meta)
  }

  onMessage(listener: Listener<unknown>) {
    this.messageListeners.add(listener)
    return () => void this.messageListeners.delete(listener)
  }

  /** Also calls the listener right away if presence has already synced. */
  onPresence(listener: Listener<string[]>) {
    this.presenceListeners.add(listener)
    if (this.presenceSynced) listener(this.onlineIds)
    return () => void this.presenceListeners.delete(listener)
  }

  /** Also calls the listener right away with the current status. */
  onStatus(listener: Listener<ConnectionStatus>) {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => void this.statusListeners.delete(listener)
  }

  close() {
    void getSupabase().removeChannel(this.channel)
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    for (const l of this.statusListeners) l(status)
  }
}

const open = new Map<string, { connection: RoomConnection; users: number; closeTimer?: number }>()
const CLOSE_DELAY_MS = 1000

/** Get (or open) the room's connection. Call the returned release function when done. */
export function acquireRoom(roomCode: string, presenceKey: string) {
  let entry = open.get(roomCode)
  if (entry && entry.connection.presenceKey !== presenceKey) {
    // Different identity on this device (rare): start a fresh connection.
    clearTimeout(entry.closeTimer)
    entry.connection.close()
    open.delete(roomCode)
    entry = undefined
  }
  if (!entry) {
    entry = { connection: new RoomConnection(roomCode, presenceKey), users: 0 }
    open.set(roomCode, entry)
  }
  clearTimeout(entry.closeTimer)
  entry.users++
  const current = entry
  let released = false
  return {
    connection: current.connection,
    release() {
      if (released) return
      released = true
      current.users--
      if (current.users > 0) return
      current.closeTimer = window.setTimeout(() => {
        if (current.users === 0 && open.get(roomCode) === current) {
          current.connection.close()
          open.delete(roomCode)
        }
      }, CLOSE_DELAY_MS)
    },
  }
}

/**
 * Checks that nobody is in a room before the host claims its code.
 * Joins without tracking and waits for the first presence sync.
 */
export function isRoomFree(roomCode: string, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const supabase = getSupabase()
    const channel = supabase.channel(`${channelName(roomCode)}`, {
      config: { presence: { enabled: true } },
    })
    let settled = false
    const finish = (free: boolean) => {
      if (settled) return
      settled = true
      // Wait for removal: the host joins this same topic next, and supabase-js would
      // otherwise hand back this half-closed channel.
      void supabase.removeChannel(channel).finally(() => resolve(free))
    }
    channel
      .on('presence', { event: 'sync' }, () =>
        finish(Object.keys(channel.presenceState()).length === 0),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') finish(true)
      })
    // An empty room may never send a sync; no news means free.
    setTimeout(() => finish(true), timeoutMs)
  })
}
