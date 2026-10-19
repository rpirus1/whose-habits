import type { ConnectionStatus } from '@/realtime/connection'

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  return (
    <p
      role="status"
      className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-center text-sm"
    >
      {status === 'connecting' ? 'Connecting…' : 'Connection lost. Reconnecting…'}
    </p>
  )
}
