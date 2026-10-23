// Prerenders the landing page into dist/index.html after `vite build`, and keeps the empty
// shell as dist/app.html for the game routes (the Worker serves it, see worker/routes.ts).
// Also writes sitemap.xml and robots.txt. Run by `npm run build`, after the SSR build of
// src/lander/entry-server.tsx into dist-ssr/.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

interface ServerEntry {
  render(): string
  headTags(): string
  SITE_URL: string
}

const SSR_DIR = 'dist-ssr'
const entry = (await import(pathToFileURL(`${SSR_DIR}/entry-server.js`).href)) as ServerEntry

const shell = readFileSync('dist/index.html', 'utf8')
const ROOT = '<div id="root"></div>'
if (!shell.includes(ROOT) || !shell.includes('</head>')) {
  throw new Error('dist/index.html has no empty #root or </head>: did index.html change?')
}

writeFileSync('dist/app.html', shell)
writeFileSync(
  'dist/index.html',
  shell
    .replace('</head>', `  ${entry.headTags()}\n  </head>`)
    .replace(ROOT, `<div id="root">${entry.render()}</div>`),
)

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${entry.SITE_URL}/</loc><lastmod>${today}</lastmod></url>
</urlset>
`,
)
// /r/ stays crawlable on purpose: crawlers must fetch a room page to see its noindex.
writeFileSync(
  'dist/robots.txt',
  `User-agent: *
Disallow: /api/

Sitemap: ${entry.SITE_URL}/sitemap.xml
`,
)

rmSync(SSR_DIR, { recursive: true, force: true })
console.log(
  'Prerendered / into dist/index.html; shell in dist/app.html; sitemap and robots written.',
)
