// Shared by make.mjs (slides) and reels.mjs (videos): paths, flags, the logo and the statement bank.
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const here = dirname(fileURLToPath(import.meta.url))
export const root = join(here, '../../..')
const flags = join(
  dirname(createRequire(join(root, 'package.json')).resolve('country-flag-icons/package.json')),
  '1x1',
)
export const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync)

export const NAMES = {
  PL: 'Poland',
  UA: 'Ukraine',
  NL: 'The Netherlands',
  BR: 'Brazil',
  MX: 'Mexico',
  US: 'United States',
  TR: 'Türkiye',
  IT: 'Italy',
  FR: 'France',
  KR: 'South Korea',
}

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
export const flag = (code) => dataUri(readFileSync(join(flags, `${code}.svg`), 'utf8'))
export const logo = dataUri(readFileSync(join(root, 'public/logo.svg'), 'utf8'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
export const quotes = (s) =>
  esc(s)
    .replace(/"([^"]*)"/g, '“$1”')
    .replace(/(^|\s)'([^']*)'/g, '$1‘$2’')
    .replace(/'/g, '’')

export function statements() {
  const t = readFileSync(join(root, 'content/statements-extended.csv'), 'utf8')
  const rows = []
  let r = [],
    f = '',
    q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"' && t[i + 1] === '"') ((f += '"'), i++)
      else if (c === '"') q = false
      else f += c
    } else if (c === '"') q = true
    else if (c === ',') (r.push(f), (f = ''))
    else if (c === '\n') (r.push(f), rows.push(r), (r = []), (f = ''))
    else if (c !== '\r') f += c
  }
  const head = rows.shift()
  return new Map(rows.map((x) => [x[0], Object.fromEntries(head.map((k, i) => [k, x[i]]))]))
}

export const posts = () => JSON.parse(readFileSync(join(here, 'posts.json'), 'utf8'))
