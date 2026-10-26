// Fails the build if the prerender silently broke or statements leaked into the public files.
// Run at the end of `npm run build`.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { HERO_QUESTION, SAMPLES } from '../src/lander/content.ts'

const errors: string[] = []
const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : '')
const expect = (ok: boolean, message: string) => ok || errors.push(message)

const lander = read('dist/index.html')
expect(/<h1[^>]*>Whose Habits<\/h1>/.test(lander), 'index.html: no prerendered <h1>')
expect(lander.includes('"@type":"FAQPage"'), 'index.html: no FAQPage JSON-LD')
expect(lander.includes('"@type":"VideoGame"'), 'index.html: no VideoGame JSON-LD')
expect(/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(lander), 'index.html: no canonical')
expect(lander.includes('id="faq-title"'), 'index.html: no FAQ section')
expect(!lander.includes('%VITE_SITE_URL%'), 'index.html: VITE_SITE_URL not replaced')

const shell = read('dist/app.html')
expect(shell.includes('<div id="root"></div>'), 'app.html: missing or not an empty shell')
expect(!shell.includes('rel="canonical"'), 'app.html: must not carry the canonical')
expect(shell.includes('property="og:image"'), 'app.html: lost its link preview tags')

expect(read('dist/sitemap.xml').includes('<loc>https://'), 'sitemap.xml: missing')
const robots = read('dist/robots.txt')
expect(robots.includes('Sitemap: https://'), 'robots.txt: missing')
expect(!/^Disallow: \/\s*$/m.test(robots), 'robots.txt: blocks the whole site')
expect(lander.includes('name="robots"') && !/noindex/.test(lander), 'index.html: robots meta')
const llms = read('dist/llms.txt')
expect(llms.startsWith('# Whose Habits') && llms.includes('## FAQ'), 'llms.txt: missing')
expect(!/undefined|\[object/.test(llms), 'llms.txt: has a broken value')
expect(/Content-Security-Policy: .*'sha256-/.test(read('dist/_headers')), '_headers: no CSP')

// The statement bank lives only in the Worker (/api/deck). No statement's note may reach the
// public files, except the lander's samples: one would mean the bank (or part of it) got
// bundled into the app again.
const bank: { id: string; note: string }[] = JSON.parse(read('worker/statements.json') || '[]')
expect(bank.length > 0, 'worker/statements.json: missing (npm run content)')
const onLander = new Set([...SAMPLES, HERO_QUESTION].map((s) => s.id))
const publicFiles = readdirSync('dist', { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.(js|html|json|txt|xml)$/.test(f))
  .map((f) => read(`dist/${f}`))
  .join('\n')
const leaked = bank.filter((s) => !onLander.has(s.id) && publicFiles.includes(s.note))
expect(leaked.length === 0, `dist: ${leaked.length} statement notes found, e.g. ${leaked[0]?.id}`)

if (errors.length) {
  for (const e of errors) console.error(`  dist check  ${e}`)
  process.exit(1)
}
console.log(
  'dist check passed: prerendered lander, app shell, sitemap, robots, llms.txt, CSP, no statement bank.',
)
