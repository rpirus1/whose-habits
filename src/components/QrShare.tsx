import { Copy, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { canNativeShare, copyText } from '@/lib/share'

const roomUrl = (roomCode: string) => `${window.location.origin}/r/${roomCode}`

export function QrShare({ roomCode }: { roomCode: string }) {
  const url = roomUrl(roomCode)
  const canShare = canNativeShare()

  async function share() {
    try {
      await navigator.share({ title: 'Join my Culture Clash game', url })
    } catch {
      // Cancelled by the user; nothing to do.
    }
  }

  async function copy() {
    try {
      await copyText(url)
      toast.success('Link copied')
    } catch {
      toast.error(`Couldn't copy. The link is ${url}`)
    }
  }

  return (
    <section className="bg-card flex flex-col items-center gap-4 rounded-2xl p-5">
      {/* QR codes need dark-on-light to scan reliably, whatever the theme. SVG fills can't
          read CSS variables, so the dark modules use the theme's background colour as hex. */}
      <div className="bg-foreground rounded-xl p-3">
        <QRCodeSVG
          value={url}
          size={176}
          marginSize={0}
          fgColor="#090504"
          bgColor="transparent"
          aria-label={`QR code for ${url}`}
        />
      </div>
      <div className="text-center">
        <p className="font-medium">Scan to join, or share the link</p>
        <p className="text-muted-foreground mt-1 text-sm break-all">
          {url.replace(/^https?:\/\//, '')}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {canShare && (
          <Button size="xl" variant="secondary" onClick={share}>
            <Share2 /> Share
          </Button>
        )}
        <Button
          size="xl"
          variant="secondary"
          onClick={copy}
          className={canShare ? undefined : 'col-span-2'}
        >
          <Copy /> Copy link
        </Button>
      </div>
    </section>
  )
}
