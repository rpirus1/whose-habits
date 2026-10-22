// Appends the security headers (see security-headers-lib.ts) to dist/_headers. Run by
// `npm run build`, after the prerender, so the CSP hashes the final HTML.
import { appendFileSync, readFileSync } from 'node:fs'
import { loadEnv } from 'vite'
import {
  contentSecurityPolicy,
  inlineScripts,
  securityHeadersRule,
} from './security-headers-lib.ts'

const { VITE_SUPABASE_URL } = loadEnv('production', process.cwd(), 'VITE_')
if (!VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is missing: the CSP needs its host.')

const scripts = ['dist/index.html', 'dist/app.html'].flatMap((f) =>
  inlineScripts(readFileSync(f, 'utf8')),
)
appendFileSync(
  'dist/_headers',
  securityHeadersRule(contentSecurityPolicy(scripts, VITE_SUPABASE_URL)),
)
console.log(`Security headers written: CSP allows ${new Set(scripts).size} inline script(s).`)
