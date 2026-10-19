import { HostPanel } from '@/components/HostPanel'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { canStart } from '@/game/engine'
import type { GameState } from '@/game/types'
import { recentStatementIds, useHostGame } from '@/realtime/useHostGame'
import { ConnectionBanner } from './ConnectionBanner'
import { GamePlaceholder } from './GamePlaceholder'
import { LobbyView } from './LobbyView'

export function HostRoom({ initial }: { initial: GameState }) {
  const { state, snapshot, status, dispatch } = useHostGame(initial)

  return (
    <Screen>
      <HostPanel state={state} dispatch={dispatch} />
      {status !== 'connected' && <ConnectionBanner status={status} />}

      {state.phase === 'lobby' ? (
        <>
          <LobbyView
            snapshot={snapshot}
            meId={state.hostId}
            isHost
            onKick={(p) => dispatch({ type: 'kick', playerId: p.id })}
          />
          {canStart(state) && (
            <div className="bg-background sticky bottom-0 mt-auto pt-2">
              <Button
                size="xl"
                className="w-full"
                onClick={() =>
                  dispatch({
                    type: 'start',
                    gameId: crypto.randomUUID(),
                    recentIds: recentStatementIds(),
                  })
                }
              >
                Start game
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <GamePlaceholder snapshot={snapshot} />
          {state.phase === 'reveal' && (
            <Button size="xl" onClick={() => dispatch({ type: 'next' })}>
              Next
            </Button>
          )}
          {state.phase === 'final' && (
            <Button
              size="xl"
              onClick={() => dispatch({ type: 'playAgain', gameId: crypto.randomUUID() })}
            >
              Play again
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}
