import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { PlayerList } from '@/components/PlayerList'
import { SettingsForm } from '@/components/SettingsForm'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import type { Action } from '@/game/engine'
import { currentRound, validSettings } from '@/game/engine'
import type { PublicPlayer } from '@/game/protocol'
import type { GameState } from '@/game/types'
import { useConfirmTap } from '@/hooks/useConfirmTap'

/**
 * The host's menu, top to bottom by how often it's needed: game settings (lobby) or game
 * controls and players (in game), then the theme, then End game, kept last and apart so
 * a quick tap on Pause can't land on it.
 */
export function HostMenu({
  state,
  players,
  dispatch,
  close,
}: {
  state: GameState
  players: PublicPlayer[]
  dispatch: (action: Action) => void
  close: () => void
}) {
  const inGame = state.phase === 'question' || state.phase === 'reveal'

  return (
    <>
      {state.phase === 'lobby' && (
        <SettingsForm
          value={state.settings}
          onChange={(settings) => {
            if (validSettings(settings)) dispatch({ type: 'updateSettings', settings })
          }}
        />
      )}
      {inGame && <GameControls state={state} dispatch={dispatch} />}
      {inGame && (
        <PlayerList
          players={players}
          meId={state.hostId}
          compact
          onKick={(p) => dispatch({ type: 'kick', playerId: p.id })}
        />
      )}
      {state.phase !== 'final' && <Separator />}
      <ThemeSwitcher />
      {inGame && (
        <>
          <Separator />
          <EndGameButton
            onEnd={() => {
              close()
              dispatch({ type: 'end' })
            }}
          />
        </>
      )}
    </>
  )
}

function GameControls({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (action: Action) => void
}) {
  const round = currentRound(state)
  const canGoBack = !!round && (state.viewing ?? round.index) > 0
  const canSkip = state.phase === 'question' && state.viewing === null

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="xl"
          className="flex-col gap-0 text-sm"
          onClick={() => dispatch({ type: state.paused ? 'resume' : 'pause' })}
        >
          {state.paused ? <Play /> : <Pause />}
          {state.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          variant="secondary"
          size="xl"
          className="flex-col gap-0 text-sm"
          disabled={!canGoBack}
          onClick={() => dispatch({ type: 'back' })}
        >
          <SkipBack />
          Back
        </Button>
        <Button
          variant="secondary"
          size="xl"
          className="flex-col gap-0 text-sm"
          disabled={!canSkip}
          onClick={() => dispatch({ type: 'skip' })}
        >
          <SkipForward />
          Skip
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Back shows earlier answers (view only). Skip swaps the habit for a new one.
      </p>
    </div>
  )
}

/** Two taps to end, so a stray tap doesn't finish the game. */
function EndGameButton({ onEnd }: { onEnd: () => void }) {
  const { armed, tap } = useConfirmTap(onEnd)
  return (
    <Button variant="destructive" size="xl" onClick={tap}>
      {armed ? 'Tap again to end the game' : 'End game'}
    </Button>
  )
}
