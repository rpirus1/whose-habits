import { describe, expect, it } from 'vitest'
import { withinLimit } from './rateLimit'
import {
  CANONICAL_ORIGIN,
  canonicalRedirect,
  fromOwnPage,
  PRIVATE_HEADERS,
  routeRequest,
} from './routes'

const route = (path: string) => routeRequest(new URL(path, 'https://example.com'))

describe('routeRequest', () => {
  it('serves the shell for game routes', () => {
    expect(route('/new')).toEqual({
      kind: 'shell',
      status: 200,
      headers: { 'X-Robots-Tag': 'noindex' },
    })
    expect(route('/r/k7m2-x9qp-4tdv')).toEqual({
      kind: 'shell',
      status: 200,
      headers: PRIVATE_HEADERS,
    })
  })

  it('redirects a valid join code to its room, in any format', () => {
    expect(route('/join?code=K7M2 X9QP 4TDV')).toEqual({
      kind: 'redirect',
      location: '/r/k7m2-x9qp-4tdv',
    })
    expect(route('/join?code=' + encodeURIComponent('https://x.dev/r/k7m2x9qp4tdv'))).toEqual({
      kind: 'redirect',
      location: '/r/k7m2-x9qp-4tdv',
    })
  })

  it('sends an invalid or missing join code back to the form', () => {
    expect(route('/join?code=hello')).toEqual({
      kind: 'redirect',
      location: '/?join=invalid#join',
    })
    expect(route('/join')).toEqual({ kind: 'redirect', location: '/?join=invalid#join' })
  })

  it('gives unknown pages the shell with a 404, and missing files a plain 404', () => {
    expect(route('/nope')).toEqual({ kind: 'shell', status: 404, headers: {} })
    expect(route('/dev')).toEqual({ kind: 'shell', status: 404, headers: {} })
    expect(route('/favicon.ico')).toEqual({ kind: 'missing' })
  })
})

describe('fromOwnPage', () => {
  const post = (headers: Record<string, string>) =>
    new Request('https://whosehabits.com/api/event', { method: 'POST', headers })

  it('accepts posts from our own pages, including room pages that send Origin "null"', () => {
    expect(fromOwnPage(post({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(true)
    expect(fromOwnPage(post({ Origin: 'https://whosehabits.com' }))).toBe(true)
    expect(fromOwnPage(post({ Origin: 'null' }))).toBe(true)
  })

  it('rejects other sites and scripts that send neither header', () => {
    expect(fromOwnPage(post({ 'Sec-Fetch-Site': 'cross-site', Origin: 'null' }))).toBe(false)
    expect(fromOwnPage(post({ 'Sec-Fetch-Site': 'same-site' }))).toBe(false)
    expect(fromOwnPage(post({ Origin: 'https://evil.example' }))).toBe(false)
    expect(fromOwnPage(post({}))).toBe(false)
  })
})

describe('withinLimit', () => {
  it('keys the limit by IP address, and allows everything without a limiter', async () => {
    const keys: string[] = []
    const limiter = {
      limit: async ({ key }: { key: string }) => (keys.push(key), { success: keys.length < 2 }),
    }
    const req = new Request('https://x.test/', { headers: { 'CF-Connecting-IP': '1.2.3.4' } })
    expect(await withinLimit(limiter, req)).toBe(true)
    expect(await withinLimit(limiter, req)).toBe(false)
    expect(keys).toEqual(['1.2.3.4', '1.2.3.4'])
    expect(await withinLimit(undefined, req)).toBe(true)
  })
})

describe('canonicalRedirect', () => {
  const to = (href: string) => canonicalRedirect(new URL(href))

  it('sends the bare domain and the workers.dev address to www, keeping path and query', () => {
    expect(to('https://whosehabits.com/')).toBe('https://www.whosehabits.com/')
    expect(to('https://culture-clash.ruslan-pirus.workers.dev/r/k7m2-x9qp-4tdv?test=1')).toBe(
      'https://www.whosehabits.com/r/k7m2-x9qp-4tdv?test=1',
    )
  })

  it('leaves www, local dev, version previews and the event API alone', () => {
    expect(to('https://www.whosehabits.com/new')).toBeNull()
    expect(to('http://localhost:8788/')).toBeNull()
    expect(to('https://1a2b3c4d-culture-clash.ruslan-pirus.workers.dev/')).toBeNull()
    expect(to('https://culture-clash.ruslan-pirus.workers.dev/api/event')).toBeNull()
    expect(to('https://whosehabits.com/api/event')).toBeNull()
  })
})

it('redirects to the same address the build uses for canonical links', async () => {
  const { readFileSync } = await import('node:fs')
  const env = readFileSync('.env.production', 'utf8')
  expect(env).toMatch(/^VITE_SITE_URL=(.*)$/m)
  expect(env.match(/^VITE_SITE_URL=(.*)$/m)![1].trim()).toBe(CANONICAL_ORIGIN)
})
