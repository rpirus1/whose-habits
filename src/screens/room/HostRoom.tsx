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
import { AloneDialog } from './AloneDialog'
import { ConnectionBanner } from './ConnectionBanner'
import { GameView } from './GameView'
import { LobbyView } from './LobbyView'
import { useJoinToasts } from './useJoinToasts'

export function HostRoom({ initial }: { initial: GameState }) {
  const { state, snapshot, status, dispatch } = useHostGame(initial)
  const round = currentRound(state)
  const here = state.players.filter((p) => p.connected).length
  useJoinToasts(state)
  // The host's phone runs the game: keep its screen on from the lobby to the end.
  useWakeLock(state.phase !== 'final')

  return (
    <Screen>
      <AppBar
        menuLabel="Host menu"
        dot={state.paused}
        leaveWarning={
          state.phase === 'question' || state.phase === 'reveal'
            ? 'The game runs on your phone, so it stops for everyone until you come back. You can return with the same link.'
            : undefined
        }
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
                Start with {here} players
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
          onReport={{
            open: (statementId) =>
              dispatch({ type: 'reportOpen', playerId: state.hostId, statementId }),
            done: (statementId, reason) =>
              dispatch({ type: 'reportDone', playerId: state.hostId, statementId, reason }),
          }}
        />
      )}

      {state.waitingForPlayers && (
        <AloneDialog
          roomCode={state.roomCode}
          backNames={state.players.filter((p) => p.connected && !p.isHost).map((p) => p.name)}
          onContinue={() => dispatch({ type: 'resume' })}
          onEnd={() => dispatch({ type: 'end' })}
        />
      )}
    </Screen>
  )
}
