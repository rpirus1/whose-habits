import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { CountryCount, CountryPicker, GameOptions, ModeCards } from '@/components/SettingsForm'
import { countriesNeeded, MODE_COPY } from '@/lib/gameMode'
import { Screen } from '@/components/Screen'
import { StickyFooter } from '@/components/StickyFooter'
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner'
import { Button } from '@/components/ui/button'
import { newId } from '@/lib/id'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGame, DEFAULT_HOST_NAME } from '@/game/engine'
import { generateRoomCode } from '@/game/roomCode'
import type { GameMode, Settings } from '@/game/types'
import { DEFAULT_SETTINGS, isRandom, MAX_NAME_LENGTH } from '@/game/types'
import type { GameSource } from '@/lib/events'
import { keys, load, save } from '@/lib/storage'
import { saveHostGame } from '@/lib/savedRooms'

/**
 * One job per step, so a small screen never hides why the button is disabled:
 * mode → countries (Choose countries only) → name, rounds and time.
 */
const STEPS = ['mode', 'countries', 'details'] as const
type Step = (typeof STEPS)[number]

const TITLES: Record<Step, string> = {
  mode: 'How do you want to play?',
  countries: 'Pick countries',
  details: 'Last details',
}

export function SettingsScreen() {
  const navigate = useNavigate()
  // Where the host came from (metrics only): ?from=cta from a guest's "Host your own game",
  // ?from=lander from the lander's "Host a game".
  const [searchParams, setSearchParams] = useSearchParams()
  const from = searchParams.get('from')
  const source: GameSource = from === 'cta' ? 'guest_cta' : from === 'lander' ? 'lander' : 'direct'
  const [hostName, setHostName] = useState(() => load<string>(keys.lastName) ?? '')
  // The last mode is remembered (for the highlight), but the host chooses it again each time.
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...load<Settings>(keys.lastSettings),
  }))
  const [chosen, setChosen] = useState(false)
  const [creating, setCreating] = useState(false)

  // The step lives in the URL, so the phone's Back button goes back a step. A reload lands on a
  // step that isn't ready yet → the earliest one that is.
  const asked = STEPS.find((s) => s === searchParams.get('step')) ?? 'mode'
  const step: Step =
    !chosen && asked !== 'mode'
      ? 'mode'
      : asked === 'countries' && isRandom(settings)
        ? 'details'
        : asked === 'details' && countriesNeeded(settings)
          ? 'countries'
          : asked

  const goTo = (next: Step) => {
    const params = new URLSearchParams(searchParams)
    params.set('step', next)
    setSearchParams(params)
  }

  const pickMode = (mode: GameMode) => {
    setSettings((s) => ({ ...s, mode }))
    setChosen(true)
    goTo(mode === 'random' ? 'details' : 'countries')
  }

  // Back a step through history when we came from it, else to the step before.
  const back = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else goTo(step === 'details' && !isRandom(settings) ? 'countries' : 'mode')
  }

  function invite() {
    setCreating(true)
    try {
      // Random enough that collisions aren't a practical concern.
      const roomCode = generateRoomCode()

      save(keys.lastSettings, settings)
      save(keys.lastName, hostName.trim())
      saveHostGame(createGame({ roomCode, hostId: newId(), hostName, settings, source }))
      navigate(`/r/${roomCode}`)
    } catch (error) {
      console.error(error)
      toast.error("Couldn't create a game. Please try again.")
      setCreating(false)
    }
  }

  const needed = countriesNeeded(settings)

  return (
    <Screen>
      <header className="flex items-center gap-2">
        {step === 'mode' ? (
          <Button asChild variant="ghost" size="icon-lg" aria-label="Back">
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-lg" aria-label="Back" onClick={back}>
            <ArrowLeft />
          </Button>
        )}
        <h1 className="font-heading text-2xl font-bold">{TITLES[step]}</h1>
        {step === 'countries' && (
          <span className="ml-auto">
            <CountryCount count={settings.cultures.length} />
          </span>
        )}
      </header>

      <InAppBrowserBanner host />

      {step === 'mode' && (
        <ModeCards value={chosen ? settings.mode : undefined} onPick={pickMode} />
      )}

      {step === 'countries' && (
        <>
          <CountryPicker value={settings} onChange={setSettings} />
          <StickyFooter>
            <Button
              size="xl"
              className="w-full"
              disabled={needed > 0}
              onClick={() => goTo('details')}
            >
              {needed ? `Pick ${needed} more` : 'Next'}
            </Button>
          </StickyFooter>
        </>
      )}

      {step === 'details' && (
        <>
          <p className="text-muted-foreground -mt-3 text-sm">
            {MODE_COPY[settings.mode ?? 'pick'].title}
            {!isRandom(settings) && ` · ${settings.cultures.length} countries`}
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="host-name">
              Your name <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="host-name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder={DEFAULT_HOST_NAME}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="nickname"
              className="h-12 text-lg"
            />
          </div>
          <GameOptions value={settings} onChange={setSettings} />
          <StickyFooter>
            <Button size="xl" className="w-full" disabled={creating} onClick={invite}>
              {creating ? 'Creating room…' : 'Invite players'}
            </Button>
          </StickyFooter>
        </>
      )}
    </Screen>
  )
}
