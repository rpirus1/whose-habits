import { describe, expect, it } from 'vitest'
import { withinLimit } from './rateLimit'
import { fromOwnPage, routeRequest } from './routes'

const route = (path: string) => routeRequest(new URL(path, 'https://example.com'))

describe('routeRequest', () => {
  it('serves the shell for game routes', () => {
    expect(route('/new')).toEqual({ kind: 'shell', status: 200, private: false })
    expect(route('/r/k7m2-x9qp-4tdv')).toEqual({ kind: 'shell', status: 200, private: true })
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
    expect(route('/nope')).toEqual({ kind: 'shell', status: 404, private: false })
    expect(route('/dev')).toEqual({ kind: 'shell', status: 404, private: false })
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
