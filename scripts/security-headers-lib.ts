// Builds the security headers for every page. The CSP allows only our own files, the inline
// scripts in the built HTML (by hash, so an injected script can't run) and the Supabase
// Realtime host the game talks to.
import { createHash } from 'node:crypto'

/** The bodies of the executable inline scripts in an HTML page (not JSON-LD data blocks). */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .filter(
      ([, attrs = '']) => !/\bsrc=/.test(attrs) && !/type="application\/ld\+json"/.test(attrs),
    )
    .map(([, , body]) => body)
}

export function contentSecurityPolicy(scripts: string[], supabaseUrl: string): string {
  const hashes = [...new Set(scripts)].map(
    (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`,
  )
  const host = new URL(supabaseUrl).host
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // React's style props and the lander's prerendered styles are inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' https://${host} wss://${host}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/** A _headers rule for every path. Referrer-Policy stays per path (rooms send none). */
export function securityHeadersRule(csp: string): string {
  return `
# Security headers for every page (added by scripts/security-headers.ts at build time).
/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000
`
}
