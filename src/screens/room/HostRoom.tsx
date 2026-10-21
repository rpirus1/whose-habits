import { AppBar } from '@/components/AppBar'
import { HostMenu } from '@/components/HostMenu'
import { Screen } from '@/components/Screen'
import { StickyFooter } from '@/components/StickyFooter'
import { Button } from '@/components/ui/button'
import { newId } from '@/lib/id'
import { canStart, currentRound } from '@/game/engine'
import type { GameState } from '@/game/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { recentStatementIds, useHostGame } from '@/realtime/useHostGame'
import { ConnectionBanner } from './ConnectionBanner'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'

export function HostRoom({ initial }: { initial: GameState }) {
  const { state, snapshot, status, dispatch } = useHostGame(initial)
  const round = currentRound(state)
  // The host's phone runs the game: keep its screen on from the lobby to the end.
  useWakeLock(state.phase !== 'final')

  return (
    <Screen>
      <AppBar
        menuLabel="Host menu"
        dot={state.paused}
        menu={(close) => (
          <HostMenu state={state} players={snapshot.players} dispatch={dispatch} close={close} />
        )}
      />
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
            <StickyFooter>
              <Button
                size="xl"
                className="w-full"
                onClick={() =>
                  dispatch({
                    type: 'start',
                    gameId: newId(),
                    recentIds: recentStatementIds(),
                  })
                }
              >
                Start game
              </Button>
            </StickyFooter>
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
          onPlayAgain={() => dispatch({ type: 'playAgain', gameId: newId() })}
          onResume={() => dispatch({ type: 'resume' })}
        />
      )}
    </Screen>
  )
}
