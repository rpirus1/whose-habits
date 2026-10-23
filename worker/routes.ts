// What the Worker does with a request that matched no static file (not_found_handling = "none"
// in wrangler.toml). "/" is a real file (the prerendered lander), so it never gets here.
import { parseJoinInput } from '../src/lander/join'

export type Route =
  /** The empty app shell (dist/app.html), rendered by the React router in the browser. */
  | { kind: 'shell'; status: 200 | 404; headers: Record<string, string> }
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
  // The host's setup screen: a page for the game, not for search results.
  if (path === '/new' || path === '/new/') return { kind: 'shell', status: 200, headers: NOINDEX }
  // Room links are private invitations: kept out of search engines and Referer headers.
  if (path.startsWith('/r/')) return { kind: 'shell', status: 200, headers: PRIVATE_HEADERS }
  if (/\.[a-z0-9]+$/i.test(path)) return { kind: 'missing' }
  // Unknown page: the app shows "Page not found", with a real 404 status for crawlers.
  return { kind: 'shell', status: 404, headers: {} }
}

/** Where the shell lives in the assets (app.html; the assets layer drops the extension). */
export const SHELL_PATH = '/app'

const NOINDEX = { 'X-Robots-Tag': 'noindex' }

export const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
}

/**
 * Whether a POST came from one of our own pages. Browsers always send Sec-Fetch-Site or
 * Origin (room pages send Origin "null", their referrer policy being no-referrer), so a
 * request with neither is a script. Blocks drive-by and casual spam; a determined sender can
 * fake both, which the rate limit covers.
 */
export function fromOwnPage(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site')
  const origin = request.headers.get('Origin')
  if (site) return site === 'same-origin'
  if (!origin) return false
  return origin === 'null' || origin === new URL(request.url).origin
}
