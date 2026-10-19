import { Link } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'

export function NotFoundScreen() {
  return (
    <Screen className="justify-center text-center">
      <h1 className="font-heading text-2xl font-bold">Page not found</h1>
      <Button asChild size="xl" variant="secondary">
        <Link to="/">Go home</Link>
      </Button>
    </Screen>
  )
}
