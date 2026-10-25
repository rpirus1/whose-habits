import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHydrated } from '@/lander/useHydrated'
import { androidBrowserIntent, inAppBrowser } from '@/lib/inAppBrowser'
import { copyText } from '@/lib/share'
import { cn } from '@/lib/utils'

/**
 * Instagram, Messenger, Facebook and LinkedIn open links in their own browser. There the phone's
 * share sheet is missing, and the tab is easy to lose: closing the chat closes the game, and for
 * a host that ends it for everyone. Shown on the lander, the setup screen and the lobby; once the
 * game starts it would only take space.
 */
export function InAppBrowserBanner({ className }: { className?: string }) {
  // The lander is prerendered: the user agent is only known after hydration.
  const hydrated = useHydrated()
  const app = hydrated ? inAppBrowser(navigator.userAgent) : null
  if (!app) return null

  const android = /Android/i.test(navigator.userAgent)

  async function copy() {
    try {
      await copyText(window.location.href)
      toast.success('Link copied. Paste it in your browser.')
    } catch {
      toast.error(`Couldn't copy. The link is ${window.location.href}`)
    }
  }

  return (
    <section className={cn('bg-card ring-border flex gap-3 rounded-2xl p-4 ring-1', className)}>
      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
        <ExternalLink className="text-primary size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="text-sm leading-snug">
          <p className="font-medium">You’re in {app}’s browser</p>
          <p className="text-muted-foreground">
            Open the game in your phone’s browser, so it doesn’t get lost.
            {!android && ' Tap ⋯ and choose Open in browser.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {android && (
            <Button asChild size="lg" className="px-4">
              <a href={androidBrowserIntent(window.location.href)}>
                <ExternalLink /> Open in browser
              </a>
            </Button>
          )}
          <Button size="lg" variant="secondary" className="px-4" onClick={copy}>
            <Copy /> Copy link
          </Button>
        </div>
      </div>
    </section>
  )
}
