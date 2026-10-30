// One Supabase Realtime channel per room: broadcast for messages, presence for who's online.
//
// Each connection has its own Realtime client, so a closing room can never collide with a
// new one on the same topic. Connections are shared and closed with a short delay, so React
// StrictMode's mount → unmount → mount (and quick screen changes) don't re-join the room.
import type { RealtimeChannel, RealtimeClient } from '@supabase/realtime-js'
import { CHANNEL_EVENT, channelName } from '@/game/protocol'
import { createRealtimeClient } from './supabase'

export type ConnectionStatus = 'connecting' | 'connected' | 'error'

type Listener<T> = (value: T) => void

export class RoomConnection {
  readonly roomCode: string
  readonly presenceKey: string
  status: ConnectionStatus = 'connecting'
  onlineIds: string[] = []
  /** False until the first presence sync; before that, onlineIds is not meaningful. */
  presenceSynced = false
  /** Someone in the room tracks { role: 'host' }: the host's phone is online. */
  hostOnline = false

  private client: RealtimeClient
  private channel: RealtimeChannel
  /** Null until track(): until then this device only listens and isn't in the room's presence. */
  private meta: Record<string, unknown> | null = null
  private messageListeners = new Set<Listener<unknown>>()
  private presenceListeners = new Set<Listener<string[]>>()
  private statusListeners = new Set<Listener<ConnectionStatus>>()

  constructor(roomCode: string, presenceKey: string) {
    this.roomCode = roomCode
    this.presenceKey = presenceKey
    this.client = createRealtimeClient()
    this.channel = this.client.channel(channelName(roomCode), {
      config: { broadcast: { self: false }, presence: { key: presenceKey, enabled: true } },
    })
    this.channel
      .on('broadcast', { event: CHANNEL_EVENT }, ({ payload }) => {
        for (const l of this.messageListeners) l(payload)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState<{ role?: string }>()
        this.onlineIds = Object.keys(state)
        this.hostOnline = Object.values(state).some((metas) => metas.some((m) => m.role === 'host'))
        this.presenceSynced = true
        for (const l of this.presenceListeners) l(this.onlineIds)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (this.meta) void this.channel.track(this.meta)
          this.setStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // The client keeps retrying; the UI shows "reconnecting" meanwhile.
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
    void this.client.removeAllChannels().then(() => this.client.disconnect())
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
