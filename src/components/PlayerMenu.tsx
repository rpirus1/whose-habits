import { LogOut } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useConfirmTap } from '@/hooks/useConfirmTap'

/** A player's menu: who you are, the theme, and Leave game kept last and apart. */
export function PlayerMenu({ name, onLeave }: { name?: string; onLeave?: () => void }) {
  return (
    <>
      {name && (
        <p className="text-muted-foreground -mb-2 text-sm">
          Playing as <span className="text-foreground font-medium">{name}</span>
        </p>
      )}
      <ThemeSwitcher />
      {onLeave && (
        <>
          <Separator />
          <LeaveButton onLeave={onLeave} />
        </>
      )}
    </>
  )
}

/** Two taps, like End game, so a stray tap doesn't drop you out of the game. */
function LeaveButton({ onLeave }: { onLeave: () => void }) {
  const { armed, tap } = useConfirmTap(onLeave)
  return (
    <Button variant="destructive" size="xl" onClick={tap}>
      <LogOut />
      {armed ? 'Tap again to leave' : 'Leave game'}
    </Button>
  )
}
