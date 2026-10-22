import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, inlineScripts } from './security-headers-lib.ts'

const sha = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`

describe('security headers', () => {
  it('hashes executable inline scripts only', () => {
    const html = `<head><script>var a = 1</script>
      <script type="application/ld+json">{"@type":"FAQPage"}</script>
      <script type="module" crossorigin src="/assets/index.js"></script></head>`
    expect(inlineScripts(html)).toEqual(['var a = 1'])
  })

  it('allows our own files, the hashed scripts and the Supabase host', () => {
    const csp = contentSecurityPolicy(['var a = 1', 'var a = 1'], 'https://abc.supabase.co/')
    expect(csp).toContain(`script-src 'self' ${sha('var a = 1')};`)
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-eval')
  })
})
