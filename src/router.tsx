import { createBrowserRouter } from 'react-router'
import { HomeScreen } from '@/screens/HomeScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { RoomScreen } from '@/screens/RoomScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'

export const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/new', element: <SettingsScreen /> },
  // One route for everyone in a room; the role (host or guest) comes from localStorage.
  { path: '/r/:code', element: <RoomScreen /> },
  // Dev server only: game screens with made-up data, for UI work. Left out of builds.
  ...(import.meta.env.DEV
    ? [
        {
          path: '/dev',
          lazy: async () => ({
            Component: (await import('@/screens/DevScreensScreen')).DevScreensScreen,
          }),
        },
      ]
    : []),
  { path: '*', element: <NotFoundScreen /> },
])
