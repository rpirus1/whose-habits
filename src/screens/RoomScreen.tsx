import { useParams } from 'react-router'
import { Screen } from '@/components/Screen'

// Built in steps 4–6: join, lobby, question, reveal and final views for host and guests.
export function RoomScreen() {
  const { code } = useParams()
  return (
    <Screen>
      <h1 className="font-heading text-2xl font-bold">Room {code?.toUpperCase()}</h1>
      <p className="text-muted-foreground">Coming in the lobby step.</p>
    </Screen>
  )
}
