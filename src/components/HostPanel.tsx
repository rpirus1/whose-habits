import { ChevronDown, Pause, Play, SkipBack, SkipForward, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { PlayerList } from '@/components/PlayerList'
import { SettingsForm } from '@/components/SettingsForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Action } from '@/game/engine'
import { currentRound, validSettings } from '@/game/engine'
import type { PublicPlayer } from '@/game/protocol'
import type { GameState } from '@/game/types'
import { useConfirmTap } from '@/hooks/useConfirmTap'

/** Collapsible host-only controls, so the rest of the screen stays the same as a player's. */
export function HostPanel({
  state,
  players,
  dispatch,
}: {
  state: GameState
  players: PublicPlayer[]
  dispatch: (action: Action) => void
}) {
  const [open, setOpen] = useState(false)
  // Edits go through a draft so the host can pass through invalid states (e.g. 1 culture).
  const [draft, setDraft] = useState(state.settings)
  const inGame = state.phase === 'question' || state.phase === 'reveal'

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card rounded-2xl">
      <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-2 px-4 font-medium">
        <SlidersHorizontal className="text-primary size-4" />
        Host controls
        {state.paused && <Badge variant="secondary">Paused</Badge>}
        <ChevronDown
          className={`text-muted-foreground ml-auto size-5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 px-4 pb-4">
        {state.phase === 'lobby' && (
          <SettingsForm
            value={draft}
            onChange={(settings) => {
              setDraft(settings)
              if (validSettings(settings)) dispatch({ type: 'updateSettings', settings })
            }}
          />
        )}
        {inGame && <GameControls state={state} dispatch={dispatch} />}
        {inGame && (
          <PlayerList
            players={players}
            meId={state.hostId}
            onKick={(p) => dispatch({ type: 'kick', playerId: p.id })}
          />
        )}
        {state.phase === 'final' && (
          <p className="text-muted-foreground text-sm">The game is over.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
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
        Back shows earlier answers (view only). Skip swaps the statement for a new one.
      </p>
      <EndGameButton onEnd={() => dispatch({ type: 'end' })} />
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
