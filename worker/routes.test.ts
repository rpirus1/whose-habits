import { describe, expect, it } from 'vitest'
import { routeRequest } from './routes'

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
