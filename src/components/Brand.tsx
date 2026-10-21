import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Logo, name and the Beta chip: one link home, the same on the lander and in the game. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Whose Habits (beta), home"
      className={cn(
        'font-heading focus-visible:ring-ring/50 -ml-1 flex items-center gap-2 rounded-lg px-1 text-lg font-bold outline-none focus-visible:ring-3',
        className,
      )}
    >
      <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
      Whose Habits
      <Badge variant="soft" className="ml-0.5 font-sans">
        Beta
      </Badge>
    </Link>
  )
}
