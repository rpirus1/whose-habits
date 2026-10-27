import { ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useHydrated } from '@/lander/useHydrated'
import { handoffUrl, type HandoffRole } from '@/lib/handoff'
import { androidBrowserIntent, inAppBrowser } from '@/lib/inAppBrowser'
import { markMovedToBrowser } from '@/lib/savedRooms'
import { keys } from '@/lib/storage'
import { cn } from '@/lib/utils'

/** In a room: what "Open in browser" carries over, and what to do once it's gone. */
export interface RoomHandoff {
  roomCode: string
  role: HandoffRole
  /** This browser stops playing (the room screen shows "continued in your browser"). */
  onMoved: () => void
}

/**
 * Instagram, Messenger, Facebook and LinkedIn open links in their own browser. There the phone's
 * share sheet is missing, and the tab is easy to lose: closing the chat closes the game, and for
 * a host that ends it for everyone. Shown on the lander, the setup screen and the lobby; once the
 * game starts it would only take space. Closing it hides it for the rest of the visit.
 *
 * In a room, "Open in browser" takes this device's role along (lib/handoff.ts): otherwise the
 * phone's browser, with its own storage, would join as a new player.
 */
export function InAppBrowserBanner({
  className,
  host = false,
  room,
}: {
  className?: string
  /** On the host's screens: iPhones can't carry the game over, so switch before inviting. */
  host?: boolean
  room?: RoomHandoff
}) {
  // The lander is prerendered: the user agent is only known after hydration.
  const hydrated = useHydrated()
  const [closed, setClosed] = useState(readClosed)
  const userAgent = hydrated ? browserUserAgent() : ''
  const app = hydrated ? inAppBrowser(userAgent) : null
  if (!app || closed) return null

  const android = /Android/i.test(userAgent)
  const target = room ? handoffUrl(location.origin, room.roomCode, room.role) : window.location.href

  return (
    <section
      className={cn('bg-card ring-border relative flex gap-3 rounded-2xl p-4 ring-1', className)}
    >
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
        <ExternalLink className="text-primary size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* pr-8: clear of the close button. */}
        <div className="pr-8 text-sm leading-snug">
          <p className="font-medium">You’re in {app}’s browser</p>
          <p className="text-muted-foreground">
            Open the game in your phone’s browser, so it doesn’t get lost.
            {!android && ' Tap ⋯ and choose Open in browser.'}
            {!android && host && ' Do it before friends join: the game can’t move later.'}
          </p>
        </div>
        {android && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="px-4">
              <a
                href={androidBrowserIntent(target)}
                onClick={() => {
                  if (!room) return
                  markMovedToBrowser(room.roomCode)
                  room.onMoved()
                }}
              >
                <ExternalLink /> Open in browser
              </a>
            </Button>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        className="absolute top-2 right-2"
        aria-label="Close"
        onClick={() => {
          setClosed(true)
          try {
            sessionStorage.setItem(`cc:${keys.inAppBannerClosed}`, '1')
          } catch {
            // Closed for this screen only.
          }
        }}
      >
        <X />
      </Button>
    </section>
  )
}

function readClosed(): boolean {
  try {
    return sessionStorage.getItem(`cc:${keys.inAppBannerClosed}`) === '1'
  } catch {
    return false
  }
}

/**
 * The real user agent. In development, ?inapp=instagram (or facebook, linkedin; add &ios=1 for
 * an iPhone) pretends to be that app's browser for the rest of the tab's visit, to see the banner
 * on a desktop browser; ?inapp=off stops it.
 */
function browserUserAgent(): string {
  if (import.meta.env.DEV) {
    let fake: string | null = null
    try {
      const param = new URLSearchParams(location.search).get('inapp')
      if (param) {
        const ios = new URLSearchParams(location.search).get('ios') ? 'iPhone' : 'Linux; Android 14'
        sessionStorage.setItem('cc:devInApp', param === 'off' ? '' : `${param}|${ios}`)
      }
      fake = sessionStorage.getItem('cc:devInApp')
    } catch {
      // Storage blocked: the real user agent.
    }
    if (fake) {
      const [app, platform] = fake.split('|')
      const token = { instagram: 'Instagram 300.0', facebook: 'FBAV/400', linkedin: 'LinkedInApp' }[
        app ?? ''
      ]
      if (token) return `Mozilla/5.0 (${platform}) ${token}`
    }
  }
  return navigator.userAgent
}
