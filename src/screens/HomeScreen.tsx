import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { listSavedRooms } from '@/lib/savedRooms'

const MAX_REJOIN = 2

export function HomeScreen() {
  // Closed the tab mid-game? Offer the way back in.
  const [rooms] = useState(() =>
    listSavedRooms()
      .filter((r) => !r.finished)
      .slice(0, MAX_REJOIN),
  )

  return (
    <Screen className="justify-center text-center">
      <div className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Whose Habits</h1>
        <p className="text-muted-foreground text-lg">
          Guess whose habit it is. Play with friends, one phone each.
        </p>
      </div>

      {rooms.length > 0 && (
        <section className="flex flex-col gap-2 text-left">
          {rooms.map((room) => (
            <Link
              key={`${room.role}-${room.roomCode}`}
              to={`/r/${room.roomCode}`}
              className="bg-card flex min-h-14 items-center gap-3 rounded-xl px-4"
            >
              <span className="flex-1">
                <span className="block font-medium">Back to your game</span>
                <span className="text-muted-foreground text-sm">
                  {room.role === 'host' ? 'You are hosting' : `Playing as ${room.name}`}
                </span>
              </span>
              <ChevronRight className="text-muted-foreground size-5" />
            </Link>
          ))}
        </section>
      )}

      <Button asChild size="xl">
        <Link to="/new">Create a game</Link>
      </Button>
      <p className="text-muted-foreground text-sm">Got a link from a friend? Just open it.</p>
    </Screen>
  )
}
