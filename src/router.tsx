import { createBrowserRouter } from 'react-router'
import { HomeScreen } from '@/screens/HomeScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { RoomScreen } from '@/screens/RoomScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { ThemePreviewScreen } from '@/screens/ThemePreviewScreen'

export const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/new', element: <SettingsScreen /> },
  // One route for everyone in a room; the role (host or guest) comes from localStorage.
  { path: '/r/:code', element: <RoomScreen /> },
  // Temporary: candidate dark themes side by side (see src/theme-candidates.css).
  { path: '/preview', element: <ThemePreviewScreen /> },
  { path: '*', element: <NotFoundScreen /> },
])
