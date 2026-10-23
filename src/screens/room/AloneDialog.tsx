import { ArrowLeft, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { QrShare } from '@/components/QrShare'
import { Button } from '@/components/ui/button'
import { useConfirmTap } from '@/hooks/useConfirmTap'

/**
 * The host's pop-up while the game waits for players: everyone else left, so the game is
 * paused until someone joins (or comes back) and the host taps Continue. It can't be
 * dismissed: the only ways out are Continue and End game.
 */
export function AloneDialog({
  roomCode,
  backNames,
  onContinue,
  onEnd,
}: {
  roomCode: string
  /** Players connected again (or newly joined); empty while the host is alone. */
  backNames: string[]
  onContinue: () => void
  onEnd: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [inviting, setInviting] = useState(false)
  const end = useConfirmTap(onEnd)
  const someoneBack = backNames.length > 0

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    // Native <dialog>, like the report pop-up: focus stays inside. Escape is ignored.
    <dialog
      ref={dialogRef}
      aria-labelledby="alone-title"
      aria-describedby="alone-text"
      onCancel={(e) => e.preventDefault()}
      className="bg-popover text-popover-foreground ring-border backdrop:bg-background/70 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl p-5 shadow-xl ring-1 backdrop:backdrop-blur-[2px]"
    >
      {someoneBack ? (
        <>
          <h2 id="alone-title" className="font-heading text-xl font-bold" aria-live="polite">
            {whoIsHere(backNames)}
          </h2>
          <p id="alone-text" className="text-muted-foreground mt-1">
            Continue when everyone is ready. Scores are saved.
          </p>
        </>
      ) : (
        <>
          <h2 id="alone-title" className="font-heading text-xl font-bold">
            You need someone else to continue
          </h2>
          <p id="alone-text" className="text-muted-foreground mt-1">
            Everyone else has left. Invite someone to keep playing. Scores are saved.
          </p>
        </>
      )}

      {inviting && !someoneBack && (
        <div className="mt-4">
          <QrShare roomCode={roomCode} />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {someoneBack ? (
          <Button size="xl" autoFocus onClick={onContinue}>
            Continue
          </Button>
        ) : inviting ? (
          <Button size="xl" variant="secondary" onClick={() => setInviting(false)}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <Button size="xl" autoFocus onClick={() => setInviting(true)}>
            <UserPlus /> Invite players
          </Button>
        )}
        <Button size="xl" variant="ghost" onClick={end.tap}>
          {end.armed ? 'Tap again to end the game' : 'End game'}
        </Button>
      </div>
    </dialog>
  )
}

/** Names for one or two players; with more, a count keeps the title short. */
function whoIsHere(names: string[]): string {
  if (names.length === 1) return `${names[0]} is here`
  if (names.length === 2) return `${names[0]} and ${names[1]} are here`
  return `${names.length} players are here`
}
