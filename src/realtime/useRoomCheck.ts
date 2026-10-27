// Watches whether a room is being hosted, while a new guest types their name (see roomCheck.ts).
// It listens on the room's connection under the guest's future player id, without joining the
// room's presence, so the host doesn't see anyone yet and joining reuses the same connection.
import { useCallback, useEffect, useState } from 'react'
import { acquireRoom } from './connection'
import { watchRoom, type RoomCheck } from './roomCheck'

/** The check, and checkAgain() to start listening again after it gave up. */
export function useRoomCheck(roomCode: string, playerId: string) {
  const [check, setCheck] = useState<RoomCheck>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const stopped = check.status === 'missing' && check.stopped === true

  useEffect(() => {
    // Gave up: let the connection close until the guest asks to check again.
    if (stopped) return
    const { connection, release } = acquireRoom(roomCode, playerId)
    const stop = watchRoom(connection, setCheck)
    return () => {
      stop()
      release()
    }
  }, [roomCode, playerId, attempt, stopped])

  const checkAgain = useCallback(() => {
    setCheck({ status: 'checking' })
    setAttempt((n) => n + 1)
  }, [])

  return { check, checkAgain }
}
