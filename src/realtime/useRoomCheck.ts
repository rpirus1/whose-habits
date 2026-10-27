// Watches whether a room is being hosted, while a new guest types their name (see roomCheck.ts).
// It listens on the room's connection under the guest's future player id, without joining the
// room's presence, so the host doesn't see anyone yet and joining reuses the same connection.
import { useEffect, useState } from 'react'
import { acquireRoom } from './connection'
import { watchRoom, type RoomCheck } from './roomCheck'

export function useRoomCheck(roomCode: string, playerId: string): RoomCheck {
  const [check, setCheck] = useState<RoomCheck>({ status: 'checking' })
  useEffect(() => {
    const { connection, release } = acquireRoom(roomCode, playerId)
    const stop = watchRoom(connection, setCheck)
    return () => {
      stop()
      release()
    }
  }, [roomCode, playerId])
  return check
}
