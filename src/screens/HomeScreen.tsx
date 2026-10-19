import { Link } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'

export function HomeScreen() {
  return (
    <Screen className="justify-center text-center">
      <div className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Culture Clash</h1>
        <p className="text-muted-foreground text-lg">
          Guess which culture each statement fits best. Play with friends, one phone each.
        </p>
      </div>
      <Button asChild size="xl">
        <Link to="/new">Create a game</Link>
      </Button>
      <p className="text-muted-foreground text-sm">Got a link from a friend? Just open it.</p>
    </Screen>
  )
}
