import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { rememberTestFlag } from '@/lib/analytics'
import { pruneSavedRooms } from '@/lib/savedRooms'
import { router } from './router'
import './index.css'

pruneSavedRooms()
rememberTestFlag()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </ThemeProvider>
  </StrictMode>,
)
