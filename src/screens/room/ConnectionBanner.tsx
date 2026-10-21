import type { ConnectionStatus } from '@/realtime/connection'

/** Floats under the top bar instead of pushing the screen down, so nothing jumps. */
export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.5rem)] z-10 flex justify-center px-4">
      <p
        role="status"
        className="bg-popover text-muted-foreground ring-border motion-safe:animate-in motion-safe:fade-in-0 rounded-full px-4 py-2 text-center text-sm shadow-lg ring-1"
      >
        {status === 'connecting' ? 'Connecting…' : 'Connection lost. Reconnecting…'}
      </p>
    </div>
  )
}
