import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { SettingsForm } from '@/components/SettingsForm'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { newId } from '@/lib/id'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MIN_CULTURES } from '@/content/cultures'
import { createGame, DEFAULT_HOST_NAME } from '@/game/engine'
import { generateRoomCode } from '@/game/roomCode'
import type { Settings } from '@/game/types'
import { DEFAULT_SETTINGS, MAX_NAME_LENGTH } from '@/game/types'
import { keys, load, save } from '@/lib/storage'
import { saveHostGame } from '@/lib/savedRooms'

export function SettingsScreen() {
  const navigate = useNavigate()
  const [hostName, setHostName] = useState(() => load<string>(keys.lastName) ?? '')
  const [settings, setSettings] = useState<Settings>(
    () => load<Settings>(keys.lastSettings) ?? DEFAULT_SETTINGS,
  )
  const [creating, setCreating] = useState(false)

  function invite() {
    setCreating(true)
    try {
      // Random enough that collisions aren't a practical concern.
      const roomCode = generateRoomCode()

      save(keys.lastSettings, settings)
      save(keys.lastName, hostName.trim())
      saveHostGame(createGame({ roomCode, hostId: newId(), hostName, settings }))
      navigate(`/r/${roomCode}`)
    } catch (error) {
      console.error(error)
      toast.error("Couldn't create a game. Please try again.")
      setCreating(false)
    }
  }

  return (
    <Screen>
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-lg" aria-label="Back">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold">Game settings</h1>
      </header>

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

      <SettingsForm value={settings} onChange={setSettings} />

      <div className="bg-background sticky bottom-0 mt-auto pt-2 pb-[env(safe-area-inset-bottom)]">
        <Button
          size="xl"
          className="w-full"
          disabled={settings.cultures.length < MIN_CULTURES || creating}
          onClick={invite}
        >
          {creating ? 'Creating room…' : 'Invite players'}
        </Button>
      </div>
    </Screen>
  )
}
