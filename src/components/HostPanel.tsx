import { ChevronDown, Crown } from 'lucide-react'
import { useState } from 'react'
import { SettingsForm } from '@/components/SettingsForm'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Action } from '@/game/engine'
import { validSettings } from '@/game/engine'
import type { GameState } from '@/game/types'

/** Collapsible host-only controls, so the rest of the screen stays the same as a player's. */
export function HostPanel({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (action: Action) => void
}) {
  const [open, setOpen] = useState(false)
  // Edits go through a draft so the host can pass through invalid states (e.g. 1 culture).
  const [draft, setDraft] = useState(state.settings)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card rounded-2xl">
      <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-2 px-4 font-medium">
        <Crown className="text-primary size-4" />
        Host controls
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
        {(state.phase === 'question' || state.phase === 'reveal') && (
          // Pause, back and skip arrive in step 6.
          <Button variant="destructive" size="xl" onClick={() => dispatch({ type: 'end' })}>
            End game
          </Button>
        )}
        {state.phase === 'final' && (
          <p className="text-muted-foreground text-sm">The game is over.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
