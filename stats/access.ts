// Checks the token Cloudflare Access adds to every request it lets through
// (Cf-Access-Jwt-Assertion). Access is the real gate: only the allowed email can log in.
// This check makes the Worker refuse anything that didn't come through Access, e.g. if the
// Access app were deleted or the Worker were reached by another URL. It fails closed.

export interface AccessConfig {
  /** Your Zero Trust team domain, e.g. "myteam.cloudflareaccess.com". */
  teamDomain: string
  /** The Access application's "Application Audience (AUD) tag". */
  aud: string
}

interface Claims {
  aud?: string | string[]
  iss?: string
  exp?: number
  nbf?: number
  email?: string
}

type KeyLookup = (kid: string) => Promise<CryptoKey | undefined>

/** Returns the logged-in email when the token is valid for this Access app, otherwise null. */
export async function verifyAccessToken(
  token: string | null,
  config: AccessConfig,
  getKey: KeyLookup,
  now = Date.now(),
): Promise<string | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]

  let header: { alg?: string; kid?: string }
  let claims: Claims
  try {
    header = JSON.parse(decodeText(headerB64))
    claims = JSON.parse(decodeText(payloadB64))
  } catch {
    return null
  }
  if (header.alg !== 'RS256' || !header.kid) return null

  const key = await getKey(header.kid)
  if (!key) return null
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  )
  if (!valid) return null

  const seconds = now / 1000
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audiences.includes(config.aud)) return null
  if (claims.iss !== `https://${config.teamDomain}`) return null
  if (typeof claims.exp !== 'number' || claims.exp < seconds) return null
  if (typeof claims.nbf === 'number' && claims.nbf > seconds + 60) return null
  return claims.email ?? null
}

/** Fetches Access's signing keys (cached for an hour per Worker instance). */
export function accessKeys(teamDomain: string): KeyLookup {
  return async (kid) => {
    const cached = keyCache.get(teamDomain)
    let keys = cached && cached.until > Date.now() ? cached.keys : undefined
    if (!keys?.has(kid)) {
      keys = await loadKeys(teamDomain)
      keyCache.set(teamDomain, { keys, until: Date.now() + 3_600_000 })
    }
    return keys.get(kid)
  }
}

const keyCache = new Map<string, { keys: Map<string, CryptoKey>; until: number }>()

async function loadKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!res.ok) return new Map()
  const { keys = [] } = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] }
  const out = new Map<string, CryptoKey>()
  for (const jwk of keys) {
    if (!jwk.kid) continue
    out.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    )
  }
  return out
}

function base64UrlDecode(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

const decodeText = (text: string) => new TextDecoder().decode(base64UrlDecode(text))
