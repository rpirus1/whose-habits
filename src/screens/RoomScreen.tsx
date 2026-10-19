import { useParams } from 'react-router'
import { normalizeRoomCode } from '@/game/roomCode'
import { loadHostGame } from '@/lib/savedRooms'
import { GuestRoom } from './room/GuestRoom'
import { HostRoom } from './room/HostRoom'
import { NotFoundScreen } from './NotFoundScreen'

/** One route for everyone in a room: the device that created it (saved game state) is the host. */
export function RoomScreen() {
  const roomCode = normalizeRoomCode(useParams().code ?? '')
  if (!roomCode) return <NotFoundScreen />

  const hostGame = loadHostGame(roomCode)
  // Keyed by room so navigating between rooms remounts everything.
  return hostGame ? (
    <HostRoom key={roomCode} initial={hostGame} />
  ) : (
    <GuestRoom key={roomCode} roomCode={roomCode} />
  )
}
