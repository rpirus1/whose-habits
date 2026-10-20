// What the Worker does with a request that matched no static file (not_found_handling = "none"
// in wrangler.toml). "/" is a real file (the prerendered lander), so it never gets here.
import { parseJoinInput } from '../src/lander/join'

export type Route =
  /** The empty app shell (dist/app.html), rendered by the React router in the browser. */
  | { kind: 'shell'; status: 200 | 404; private: boolean }
  | { kind: 'redirect'; location: string }
  /** A missing file (has an extension): a plain 404 from the assets layer. */
  | { kind: 'missing' }

export function routeRequest(url: URL): Route {
  const path = url.pathname
  // The lander's join form without JS (or before it loads).
  if (path === '/join') {
    const code = parseJoinInput(url.searchParams.get('code'))
    return { kind: 'redirect', location: code ? `/r/${code}` : '/?join=invalid#join' }
  }
  if (path === '/new' || path === '/new/') return { kind: 'shell', status: 200, private: false }
  // Room links are private invitations: kept out of search engines and Referer headers.
  if (path.startsWith('/r/')) return { kind: 'shell', status: 200, private: true }
  if (/\.[a-z0-9]+$/i.test(path)) return { kind: 'missing' }
  // Unknown page: the app shows "Page not found", with a real 404 status for crawlers.
  return { kind: 'shell', status: 404, private: false }
}

/** Where the shell lives in the assets (app.html; the assets layer drops the extension). */
export const SHELL_PATH = '/app'

export const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}
