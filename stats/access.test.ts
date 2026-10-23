import { beforeAll, describe, expect, it } from 'vitest'
import { verifyAccessToken } from './access'

const config = { teamDomain: 'team.cloudflareaccess.com', aud: 'aud-123' }
const now = 1_800_000_000_000
const good = {
  aud: ['aud-123'],
  iss: 'https://team.cloudflareaccess.com',
  exp: now / 1000 + 600,
  email: 'me@example.com',
}

let keys: CryptoKeyPair
let otherKeys: CryptoKeyPair

const params = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

beforeAll(async () => {
  keys = (await crypto.subtle.generateKey(params, false, ['sign', 'verify'])) as CryptoKeyPair
  otherKeys = (await crypto.subtle.generateKey(params, false, ['sign', 'verify'])) as CryptoKeyPair
})

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const encode = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)))

async function sign(
  claims: object,
  key = keys.privateKey,
  header: object = { alg: 'RS256', kid: 'k1' },
) {
  const body = `${encode(header)}.${encode(claims)}`
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

const lookup = async (kid: string) => (kid === 'k1' ? keys.publicKey : undefined)
const verify = (token: string | null) => verifyAccessToken(token, config, lookup, now)

describe('verifyAccessToken', () => {
  it('accepts a valid Access token and returns the email', async () => {
    expect(await verify(await sign(good))).toBe('me@example.com')
    expect(await verify(await sign({ ...good, aud: 'aud-123' }))).toBe('me@example.com')
  })

  it('refuses a missing, malformed or wrongly signed token', async () => {
    expect(await verify(null)).toBeNull()
    expect(await verify('not.a.jwt')).toBeNull()
    expect(await verify(await sign(good, otherKeys.privateKey))).toBeNull()
    expect(
      await verify(await sign(good, keys.privateKey, { alg: 'RS256', kid: 'unknown' })),
    ).toBeNull()
    expect(await verify(await sign(good, keys.privateKey, { alg: 'none', kid: 'k1' }))).toBeNull()
  })

  it('refuses tokens for another app, another team, or expired ones', async () => {
    expect(await verify(await sign({ ...good, aud: ['other-app'] }))).toBeNull()
    expect(
      await verify(await sign({ ...good, iss: 'https://evil.cloudflareaccess.com' })),
    ).toBeNull()
    expect(await verify(await sign({ ...good, exp: now / 1000 - 1 }))).toBeNull()
    expect(await verify(await sign({ ...good, exp: undefined }))).toBeNull()
  })
})
