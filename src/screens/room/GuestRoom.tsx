import { useState } from 'react'
import { Link } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { newId } from '@/lib/id'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_NAME_LENGTH } from '@/game/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { keys, load, save } from '@/lib/storage'
import { loadGuestIdentity, saveGuestIdentity, type GuestIdentity } from '@/lib/savedRooms'
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
  return <GuestGame roomCode={roomCode} identity={identity} />
}

function JoinView({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState(() => load<string>(keys.lastName) ?? '')
  const trimmed = name.trim()

  return (
    <Screen className="justify-center">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold">Culture Clash</h1>
        <p className="text-muted-foreground">You're invited to a game. What should we call you?</p>
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
  // A sleeping phone drops its connection, so keep the screen on during play.
  useWakeLock(snapshot?.phase === 'question' || snapshot?.phase === 'reveal')

  if (status === 'full' || status === 'kicked' || status === 'notFound') {
    const message = {
      full: 'This room is full. Ask the host to make space, or start your own game.',
      kicked: 'The host removed you from this game.',
      notFound:
        "Can't find this game. Check the link, or ask the host to open the game on their phone. Still trying…",
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
        <p className="text-muted-foreground">Joining the game…</p>
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
