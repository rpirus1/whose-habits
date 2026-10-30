import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { PlayerMenu } from '@/components/PlayerMenu'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { handoffUrl, savedRole } from '@/lib/handoff'
import { androidBrowserIntent } from '@/lib/inAppBrowser'

/**
 * In the app's built-in browser, after "Open in browser" handed the room over: this copy stays
 * quiet, so there's never a second host or player. The button carries the room again, for when
 * the "leaving the app" prompt was cancelled or the browser didn't open.
 */
export function MovedScreen({ roomCode }: { roomCode: string }) {
  const role = savedRole(roomCode)
  const target = role
    ? handoffUrl(location.origin, roomCode, role)
    : `${location.origin}/r/${roomCode}`

  return (
    <Screen>
      <AppBar menu={() => <PlayerMenu />} />
      <div className="flex flex-1 flex-col justify-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold">You’re playing in your browser now</h1>
          <p className="text-muted-foreground">
            The game moved to your phone’s browser, so it doesn’t get lost here. Switch to it to
            keep playing.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild size="xl">
            <a href={androidBrowserIntent(target)}>
              <ExternalLink /> Open in browser
            </a>
          </Button>
          <Button asChild size="xl" variant="secondary">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </Screen>
  )
}
