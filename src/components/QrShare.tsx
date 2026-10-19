import { Copy, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const roomUrl = (roomCode: string) => `${window.location.origin}/r/${roomCode}`

/** navigator.clipboard needs a secure page; the old execCommand path covers local http testing. */
async function copyText(text: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text)
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const ok = document.execCommand('copy')
  field.remove()
  if (!ok) throw new Error('Copy failed')
}

export function QrShare({ roomCode }: { roomCode: string }) {
  const url = roomUrl(roomCode)
  const canShare = typeof navigator.share === 'function'

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
      {/* QR codes need dark-on-light to scan reliably, whatever the theme. */}
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={176} marginSize={0} aria-label={`QR code for ${url}`} />
      </div>
      <div className="text-center">
        <p className="text-muted-foreground text-sm">Room code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em]">{roomCode}</p>
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
