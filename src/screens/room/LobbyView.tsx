import { Shuffle } from 'lucide-react'
import { CultureList } from '@/components/CultureList'
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner'
import { MODE_COPY } from '@/lib/gameMode'
import { isRandom } from '@/game/types'
import { PlayerList } from '@/components/PlayerList'
import { QrShare } from '@/components/QrShare'
import { HowToPlay } from '@/screens/room/HowToPlay'
import type { PublicPlayer, Snapshot } from '@/game/protocol'
import { enterScreen } from '@/lib/motion'
import { cn } from '@/lib/utils'

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
  const random = isRandom(snapshot.settings)

  return (
    <div className={cn('flex flex-col gap-6', enterScreen)}>
      <InAppBrowserBanner />
      {isHost ? (
        <QrShare roomCode={snapshot.roomCode} />
      ) : (
        <section className="bg-card flex flex-col gap-1 rounded-2xl p-5 text-center">
          <p className="text-2xl font-bold">You're in{me ? `, ${me.name}` : ''}!</p>
          <p className="text-muted-foreground">Waiting for the host to start the game.</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        {random ? (
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="flex items-center gap-2 py-1 text-sm font-medium">
              <Shuffle className="text-primary size-5" aria-hidden />
              {MODE_COPY.random.title}
            </p>
            <p className="text-muted-foreground text-sm">{MODE_COPY.random.line}</p>
          </div>
        ) : (
          <CultureList cultures={cultures} />
        )}
        <p className="text-muted-foreground text-center text-sm">
          {rounds} rounds · {seconds}s to answer
        </p>
      </section>

      <HowToPlay seconds={seconds} random={random} />

      <PlayerList players={snapshot.players} meId={meId} onKick={onKick} />
    </div>
  )
}
