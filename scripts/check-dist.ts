// Fails the build if the prerender silently broke. Run at the end of `npm run build`.
import { existsSync, readFileSync } from 'node:fs'

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
expect(read('dist/robots.txt').includes('Sitemap: https://'), 'robots.txt: missing')

if (errors.length) {
  for (const e of errors) console.error(`  dist check  ${e}`)
  process.exit(1)
}
console.log('dist check passed: prerendered lander, app shell, sitemap, robots.')
