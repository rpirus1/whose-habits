import { useState } from 'react'
import { Link } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_NAME_LENGTH } from '@/game/types'
import { keys, load, save } from '@/lib/storage'
import {
  loadGuestIdentity,
  saveGuestIdentity,
  useGuestGame,
  type GuestIdentity,
} from '@/realtime/useGuestGame'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'

export function GuestRoom({ roomCode }: { roomCode: string }) {
  const [identity, setIdentity] = useState(() => loadGuestIdentity(roomCode))

  if (!identity) {
    return (
      <JoinView
        roomCode={roomCode}
        onJoin={(name) => {
          const next: GuestIdentity = { playerId: crypto.randomUUID(), name }
          saveGuestIdentity(roomCode, next)
          save(keys.lastName, name)
          setIdentity(next)
        }}
      />
    )
  }
  return <GuestGame roomCode={roomCode} identity={identity} />
}

function JoinView({ roomCode, onJoin }: { roomCode: string; onJoin: (name: string) => void }) {
  const [name, setName] = useState(() => load<string>(keys.lastName) ?? '')
  const trimmed = name.trim()

  return (
    <Screen className="justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Joining room</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em]">{roomCode}</p>
      </div>
      <form
        className="flex flex-col gap-4"
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
    </Screen>
  )
}

function GuestGame({ roomCode, identity }: { roomCode: string; identity: GuestIdentity }) {
  const { snapshot, status, hostOnline, clockOffset, myAnswer, answer } = useGuestGame(
    roomCode,
    identity,
  )

  if (status === 'full' || status === 'kicked' || status === 'notFound') {
    const message = {
      full: 'This room is full. Ask the host to make space, or start your own game.',
      kicked: 'The host removed you from this game.',
      notFound: `Can't find room ${roomCode}. Check the link, or ask the host to open the game. Still trying…`,
    }[status]
    return (
      <Screen className="justify-center text-center">
        <p className="text-lg">{message}</p>
        <Button asChild size="xl" variant="secondary">
          <Link to="/">Go home</Link>
        </Button>
      </Screen>
    )
  }

  if (status !== 'in' || !snapshot) {
    return (
      <Screen className="items-center justify-center">
        <span className="bg-primary size-3 animate-pulse rounded-full" aria-hidden />
        <p className="text-muted-foreground">Joining room {roomCode}…</p>
      </Screen>
    )
  }

  const current = myAnswer?.roundId === snapshot.question?.roundId ? myAnswer : null

  return (
    <Screen>
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
    </Screen>
  )
}
