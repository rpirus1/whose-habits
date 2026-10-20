import { createBrowserRouter } from 'react-router'
import { Lander } from '@/lander/Lander'
import { NotFoundScreen } from '@/screens/NotFoundScreen'

export const router = createBrowserRouter([
  // Prerendered at build time; must match src/lander/entry-server.tsx.
  { path: '/', element: <Lander /> },
  // The game loads on demand, so the landing page doesn't carry it.
  {
    path: '/new',
    lazy: async () => ({
      Component: (await import('@/screens/SettingsScreen')).SettingsScreen,
    }),
  },
  // One route for everyone in a room; the role (host or guest) comes from localStorage.
  {
    path: '/r/:code',
    lazy: async () => ({
      Component: (await import('@/screens/RoomScreen')).RoomScreen,
    }),
  },
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
