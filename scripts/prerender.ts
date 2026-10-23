// Prerenders the landing page into dist/index.html after `vite build`, and keeps the empty
// shell as dist/app.html for the game routes (the Worker serves it, see worker/routes.ts).
// Also writes sitemap.xml, robots.txt and llms.txt. Run by `npm run build`, after the SSR build of
// src/lander/entry-server.tsx into dist-ssr/.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

interface ServerEntry {
  render(): string
  headTags(): string
  llmsTxt(): string
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
// Everyone may crawl the public pages, AI crawlers included: the game wants to be found and
// recommended, and nothing here is private. /r/ and /new stay crawlable on purpose: crawlers
// must fetch them to see their noindex. The named crawlers get the same rules; they're listed
// so the choice is explicit (a crawler that has its own group ignores the * group).
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]
writeFileSync(
  'dist/robots.txt',
  `User-agent: *
Disallow: /api/

${AI_CRAWLERS.map((bot) => `User-agent: ${bot}`).join('\n')}
Disallow: /api/

Sitemap: ${entry.SITE_URL}/sitemap.xml
`,
)

writeFileSync('dist/llms.txt', entry.llmsTxt())

rmSync(SSR_DIR, { recursive: true, force: true })
console.log(
  'Prerendered / into dist/index.html; shell in dist/app.html; sitemap, robots, llms.txt written.',
)
