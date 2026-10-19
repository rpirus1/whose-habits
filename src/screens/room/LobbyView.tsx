import { CultureList } from '@/components/CultureList'
import { PlayerList } from '@/components/PlayerList'
import { QrShare } from '@/components/QrShare'
import type { PublicPlayer, Snapshot } from '@/game/protocol'

export function LobbyView({
  snapshot,
  meId,
  isHost,
  onKick,
}: {
  snapshot: Snapshot
  meId: string
  isHost: boolean
  onKick?: (player: PublicPlayer) => void
}) {
  const me = snapshot.players.find((p) => p.id === meId)
  const { cultures, rounds, seconds } = snapshot.settings

  return (
    <>
      {isHost ? (
        <QrShare roomCode={snapshot.roomCode} />
      ) : (
        <section className="bg-card flex flex-col gap-1 rounded-2xl p-5 text-center">
          <p className="text-2xl font-bold">You're in{me ? `, ${me.name}` : ''}!</p>
          <p className="text-muted-foreground">Waiting for the host to start the game.</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <CultureList cultures={cultures} />
        <p className="text-muted-foreground text-center text-sm">
          {rounds} rounds · {seconds} s to answer
        </p>
      </section>

      <PlayerList players={snapshot.players} meId={meId} onKick={onKick} />
    </>
  )
}
