import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { PlayerMenu } from '@/components/PlayerMenu'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { newId } from '@/lib/id'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_NAME_LENGTH } from '@/game/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { keys, load, save } from '@/lib/storage'
import {
  loadGuestIdentity,
  markGuestRemoved,
  saveGuestIdentity,
  type GuestIdentity,
} from '@/lib/savedRooms'
import { track, trackOnce } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import type { RoomCheck } from '@/realtime/roomCheck'
import { useGuestGame } from '@/realtime/useGuestGame'
import { useRoomCheck } from '@/realtime/useRoomCheck'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'

export function GuestRoom({ roomCode, onMoved }: { roomCode: string; onMoved: () => void }) {
  const [identity, setIdentity] = useState(() => loadGuestIdentity(roomCode))
  // Join funnel, step 1: opened a room link without having joined it on this device before.
  // The room code only goes into the local "sent" key, never into the event.
  const [isNew] = useState(() => !identity)
  // Made up front: the room check listens under this id, so joining reuses its connection.
  const [playerId] = useState(newId)
  useEffect(() => {
    if (isNew) trackOnce(`opened:${roomCode}`, { type: 'join_step', step: 'opened' })
  }, [isNew, roomCode])

  if (!identity) {
    return (
      <JoinView
        roomCode={roomCode}
        playerId={playerId}
        onJoin={(name) => {
          const next: GuestIdentity = { playerId, name }
          track({ type: 'join_step', step: 'named' })
          saveGuestIdentity(roomCode, next)
          save(keys.lastName, name)
          setIdentity(next)
        }}
      />
    )
  }
  // Removed earlier on this device: no need to reconnect just to be turned away again.
  if (identity.removed === 'kicked') return <MessageScreen message={KICKED_MESSAGE} />
  if (identity.removed === 'left') {
    return (
      <MessageScreen message="You left the game.">
        <Button
          size="xl"
          onClick={() => {
            const next = { ...identity, removed: undefined }
            saveGuestIdentity(roomCode, next)
            setIdentity(next)
          }}
        >
          Rejoin
        </Button>
      </MessageScreen>
    )
  }
  return (
    <GuestGame
      roomCode={roomCode}
      identity={identity}
      onLeft={() => setIdentity({ ...identity, removed: 'left' })}
      onMoved={onMoved}
    />
  )
}

/** Every guest screen: the bar on top, the content below (centred when it's a message). */
function GuestScreen({
  children,
  menu,
  center = false,
  leaveWarning,
}: {
  children: ReactNode
  menu?: ReactNode
  center?: boolean
  leaveWarning?: string
}) {
  return (
    <Screen>
      <AppBar menu={() => menu ?? <PlayerMenu />} leaveWarning={leaveWarning} />
      {center ? (
        <div className="flex flex-1 flex-col justify-center gap-6 text-center">{children}</div>
      ) : (
        children
      )}
    </Screen>
  )
}

const KICKED_MESSAGE = 'The host removed you from this game.'

function MessageScreen({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <GuestScreen center>
      <p className="text-lg">{message}</p>
      <div className="flex flex-col gap-2">
        {children}
        <Button asChild size="xl" variant="secondary">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </GuestScreen>
  )
}

function JoinView({
  roomCode,
  playerId,
  onJoin,
}: {
  roomCode: string
  playerId: string
  onJoin: (name: string) => void
}) {
  const [name, setName] = useState(() => load<string>(keys.lastName) ?? '')
  const trimmed = name.trim()
  // Is anyone hosting this code right now? Checked while they type, so it costs no wait.
  const { check, checkAgain } = useRoomCheck(roomCode, playerId)
  const missing = check.status === 'missing'
  const stopped = missing && check.stopped === true
  // Join funnel: a dead code (mistyped, or the host's phone is off). Once per room and device.
  useEffect(() => {
    if (missing) trackOnce(`missing:${roomCode}`, { type: 'join_step', step: 'missing' })
  }, [missing, roomCode])

  if (missing) {
    return (
      <GuestScreen center>
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold">
            No game with this code is running right now
          </h1>
          <p className="text-muted-foreground">
            Check the code, or ask the host to open the game on their phone.
          </p>
        </div>
        {!stopped && (
          <p className="text-muted-foreground text-sm">
            <span
              className="bg-primary mr-2 inline-block size-2 animate-pulse rounded-full align-middle"
              aria-hidden
            />
            Still looking. The game shows up here as soon as it's back.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {/* After 10 minutes it stops listening; the guest starts it again by hand. */}
          {stopped && (
            <Button size="xl" onClick={checkAgain}>
              Check again
            </Button>
          )}
          <Button asChild size="xl" variant={stopped ? 'secondary' : 'default'}>
            <Link to={`/?code=${roomCode}#join`}>Try another code</Link>
          </Button>
          <Button asChild size="xl" variant="secondary">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </GuestScreen>
    )
  }

  return (
    <GuestScreen center>
      <div>
        <h1 className="font-heading text-3xl font-bold">You're invited!</h1>
        <p className="text-muted-foreground">What should we call you?</p>
      </div>
      <RoomStatus check={check} />
      <form
        className="flex flex-col gap-4 text-left"
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onJoin(trimmed)
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            autoFocus
            enterKeyHint="go"
            className="h-12 text-lg"
          />
        </div>
        <Button type="submit" size="xl" disabled={!trimmed}>
          Join game
        </Button>
      </form>
    </GuestScreen>
  )
}

/** One quiet line above the name field: still looking, or whose game this is. */
function RoomStatus({ check }: { check: RoomCheck }) {
  if (check.status === 'missing') return null
  return (
    <p
      role="status"
      className="text-muted-foreground -mt-2 flex items-center justify-center gap-2 text-sm"
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          check.status === 'checking' ? 'bg-muted-foreground animate-pulse' : 'bg-success',
        )}
        aria-hidden
      />
      {check.status === 'checking' ? 'Looking for the game…' : foundLine(check)}
    </p>
  )
}

function foundLine(check: Extract<RoomCheck, { status: 'found' }>): string {
  const parts = [check.hostName ? `${check.hostName}'s game` : 'Game found']
  if (check.players) parts.push(check.players === 1 ? '1 player' : `${check.players} players`)
  if (check.phase === 'question' || check.phase === 'reveal') parts.push('in progress')
  return parts.join(' · ')
}

function GuestGame({
  roomCode,
  identity,
  onLeft,
  onMoved,
}: {
  roomCode: string
  identity: GuestIdentity
  onLeft: () => void
  onMoved: () => void
}) {
  const { snapshot, status, hostOnline, clockOffset, myAnswer, answer, leave, report } =
    useGuestGame(roomCode, identity)
  // A sleeping phone drops its connection, so keep the screen on during play.
  useWakeLock(snapshot?.phase === 'question' || snapshot?.phase === 'reveal')
  // Removed or turned away: remember it, so Home stops offering "Back to your game"
  // and a refresh shows the same message instead of the join form.
  useEffect(() => {
    if (status === 'kicked' || status === 'full') markGuestRemoved(roomCode, status)
  }, [status, roomCode])
  // Join funnel: the host let them in (once per player per room).
  useEffect(() => {
    if (status === 'in') {
      trackOnce(`joined:${roomCode}:${identity.playerId}`, { type: 'join_step', step: 'joined' })
    }
  }, [status, roomCode, identity.playerId])

  if (status === 'full' || status === 'kicked' || status === 'notFound' || status === 'hostAway') {
    const message = {
      full: 'This room is full. Ask the host to make space, or start your own game.',
      kicked: KICKED_MESSAGE,
      notFound:
        "Can't find this game. Check the link, or ask the host to open the game on their phone. Still trying…",
      hostAway:
        "The host's phone isn't answering. It may be locked, or the game was closed. Ask them to open it, and you'll be back in automatically. Still trying…",
    }[status]
    return <MessageScreen message={message} />
  }

  if (status !== 'in' || !snapshot) {
    return (
      <GuestScreen center>
        <span className="bg-primary size-3 animate-pulse self-center rounded-full" aria-hidden />
        <p className="text-muted-foreground">Joining the game…</p>
      </GuestScreen>
    )
  }

  const current = myAnswer?.roundId === snapshot.question?.roundId ? myAnswer : null

  return (
    <GuestScreen
      leaveWarning={
        snapshot.phase === 'question' || snapshot.phase === 'reveal'
          ? 'The game goes on without you. You can come back with the same link and keep your score.'
          : undefined
      }
      menu={
        <PlayerMenu
          name={identity.name}
          onLeave={() => {
            leave()
            // Home stops offering this room; the link still works to rejoin.
            markGuestRemoved(roomCode, 'left')
            onLeft()
          }}
        />
      }
    >
      {!hostOnline && (
        <p role="status" className="bg-muted rounded-xl px-4 py-3 text-center text-sm">
          The host's phone is offline. Waiting for them to come back…
        </p>
      )}
      {snapshot.phase === 'lobby' ? (
        <LobbyView
          snapshot={snapshot}
          meId={identity.playerId}
          isHost={false}
          // The saved identity: it also has the host id this device learned.
          handoff={{
            roomCode,
            role: { guest: loadGuestIdentity(roomCode) ?? identity },
            onMoved,
          }}
        />
      ) : (
        <GameView
          snapshot={snapshot}
          meId={identity.playerId}
          myChoice={current ? current.choice : null}
          confirmed={current?.acked ?? false}
          clockOffset={clockOffset}
          onChoose={(choice) => snapshot.question && answer(snapshot.question.roundId, choice)}
          onReport={report}
        />
      )}
    </GuestScreen>
  )
}
