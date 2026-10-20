import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { rememberTestFlag } from '@/lib/analytics'
import { pruneSavedRooms } from '@/lib/savedRooms'
import '@/lib/theme'
import { router } from './router'
import './index.css'

pruneSavedRooms()
rememberTestFlag()

const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)

// "/" arrives prerendered (scripts/prerender.ts): hydrate it. Every other route gets the
// empty shell; `vite preview` serves the prerendered page everywhere, so clear it there.
const root = document.getElementById('root')!
if (root.hasChildNodes() && location.pathname === '/') {
  hydrateRoot(root, app)
} else {
  root.replaceChildren()
  createRoot(root).render(app)
}

// Toasts live in their own root, so the prerendered markup doesn't have to include them.
const toasts = document.createElement('div')
document.body.append(toasts)
createRoot(toasts).render(<Toaster position="top-center" />)
