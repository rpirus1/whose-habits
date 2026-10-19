import { HostPanel } from '@/components/HostPanel'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { canStart, currentRound } from '@/game/engine'
import type { GameState } from '@/game/types'
import { recentStatementIds, useHostGame } from '@/realtime/useHostGame'
import { ConnectionBanner } from './ConnectionBanner'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'

export function HostRoom({ initial }: { initial: GameState }) {
  const { state, snapshot, status, dispatch } = useHostGame(initial)
  const round = currentRound(state)

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
        <GameView
          snapshot={snapshot}
          meId={state.hostId}
          myChoice={round?.answers[state.hostId]?.choice ?? null}
          confirmed
          clockOffset={0}
          onChoose={(choice) =>
            round && dispatch({ type: 'answer', playerId: state.hostId, roundId: round.id, choice })
          }
          onNext={() => dispatch({ type: 'next' })}
          onPlayAgain={() => dispatch({ type: 'playAgain', gameId: crypto.randomUUID() })}
        />
      )}
    </Screen>
  )
}
