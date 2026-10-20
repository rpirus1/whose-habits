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
import { useGuestGame } from '@/realtime/useGuestGame'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'

export function GuestRoom({ roomCode }: { roomCode: string }) {
  const [identity, setIdentity] = useState(() => loadGuestIdentity(roomCode))

  if (!identity) {
    return (
      <JoinView
        onJoin={(name) => {
          const next: GuestIdentity = { playerId: newId(), name }
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
    />
  )
}

/** Every guest screen: the bar on top, the content below (centred when it's a message). */
function GuestScreen({
  children,
  menu,
  center = false,
}: {
  children: ReactNode
  menu?: ReactNode
  center?: boolean
}) {
  return (
    <Screen>
      <AppBar menu={() => menu ?? <PlayerMenu />} />
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

function JoinView({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState(() => load<string>(keys.lastName) ?? '')
  const trimmed = name.trim()

  return (
    <GuestScreen center>
      <div>
        <h1 className="font-heading text-3xl font-bold">You're invited!</h1>
        <p className="text-muted-foreground">What should we call you?</p>
      </div>
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

function GuestGame({
  roomCode,
  identity,
  onLeft,
}: {
  roomCode: string
  identity: GuestIdentity
  onLeft: () => void
}) {
  const { snapshot, status, hostOnline, clockOffset, myAnswer, answer, leave } = useGuestGame(
    roomCode,
    identity,
  )
  // A sleeping phone drops its connection, so keep the screen on during play.
  useWakeLock(snapshot?.phase === 'question' || snapshot?.phase === 'reveal')
  // Removed or turned away: remember it, so Home stops offering "Back to your game"
  // and a refresh shows the same message instead of the join form.
  useEffect(() => {
    if (status === 'kicked' || status === 'full') markGuestRemoved(roomCode, status)
  }, [status, roomCode])

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
        <LobbyView snapshot={snapshot} meId={identity.playerId} isHost={false} />
      ) : (
        <GameView
          snapshot={snapshot}
          meId={identity.playerId}
          myChoice={current ? current.choice : null}
          confirmed={current?.acked ?? false}
          clockOffset={clockOffset}
          onChoose={(choice) => snapshot.question && answer(snapshot.question.roundId, choice)}
        />
      )}
    </GuestScreen>
  )
}
