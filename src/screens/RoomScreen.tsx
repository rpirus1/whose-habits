import { useState } from 'react'
import { useParams } from 'react-router'
import { normalizeRoomCode } from '@/game/roomCode'
import { receiveHandoff } from '@/lib/handoff'
import { loadHostGame, movedToBrowser } from '@/lib/savedRooms'
import { GuestRoom } from './room/GuestRoom'
import { HostRoom } from './room/HostRoom'
import { MovedScreen } from './room/MovedScreen'
import { NotFoundScreen } from './NotFoundScreen'

/** One route for everyone in a room: the device that created it (saved game state) is the host. */
export function RoomScreen() {
  const roomCode = normalizeRoomCode(useParams().code ?? '')
  if (!roomCode) return <NotFoundScreen />
  return <Room key={roomCode} roomCode={roomCode} />
}

function Room({ roomCode }: { roomCode: string }) {
  // Arrived from an in-app browser's "Open in browser": take over its role before reading ours.
  useState(() => receiveHandoff(roomCode))
  // This in-app browser handed the room over: it only points to the phone's browser now.
  const [moved, setMoved] = useState(() => movedToBrowser(roomCode))
  const hostGame = loadHostGame(roomCode)

  return (
    <>
      {/* Room links are private invitations (React hoists these into <head>). */}
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      {moved ? (
        <MovedScreen roomCode={roomCode} />
      ) : hostGame ? (
        <HostRoom initial={hostGame} onMoved={() => setMoved(true)} />
      ) : (
        <GuestRoom roomCode={roomCode} onMoved={() => setMoved(true)} />
      )}
    </>
  )
}
