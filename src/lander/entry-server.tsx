// Server entry for the build-time prerender of "/" (see scripts/prerender.ts). Imports the
// lander only: no game screens, no Supabase, nothing that touches window on import.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Lander } from './Lander'

export { headTags } from './head'
export { llmsTxt } from './llms'
export { SITE_URL } from './site'

export function render(): string {
  const router = createMemoryRouter([{ path: '/', element: <Lander /> }])
  return renderToString(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}
