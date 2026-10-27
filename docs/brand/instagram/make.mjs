// Renders the Instagram slides (1080×1350) for the intro and every post in posts.json.
// Habit text and note come from content/statements-extended.csv; a post can override them
// with "text" / "note". Usage: node docs/brand/instagram/make.mjs [id ...]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const flags = join(
  dirname(createRequire(join(root, 'package.json')).resolve('country-flag-icons/package.json')),
  '1x1',
)
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync)

const NAMES = {
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
const flag = (code) => dataUri(readFileSync(join(flags, `${code}.svg`), 'utf8'))
const logo = dataUri(readFileSync(join(root, 'public/logo.svg'), 'utf8'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const quotes = (s) =>
  esc(s)
    .replace(/"([^"]*)"/g, '“$1”')
    .replace(/(^|\s)'([^']*)'/g, '$1‘$2’')
    .replace(/'/g, '’')

function statements() {
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

const CSS = `
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Bricolage Grotesque',sans-serif;color:oklch(0.985 0.005 318);
 background:radial-gradient(900px 700px at 100% 0%,oklch(0.68 0.24 318 / .30),transparent 70%),oklch(0.14 0.015 318);
 display:flex;flex-direction:column;padding:76px 84px}
.top{display:flex;align-items:center;gap:20px;font-size:36px;font-weight:800;letter-spacing:-.5px}
.top img{width:68px;height:68px}
.main{flex:1;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-size:36px;font-weight:600;color:oklch(0.72 0.03 318)}
.card{background:oklch(0.21 0.025 318);border-radius:44px;padding:56px 60px;box-shadow:0 0 0 2px oklch(0.30 0.02 318),18px 18px 0 #fdca3a}
.habit{font-size:64px;font-weight:700;line-height:1.18;letter-spacing:-1px;text-wrap:balance}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:64px}
.opt{display:flex;align-items:center;gap:22px;min-height:120px;background:oklch(0.21 0.025 318);border-radius:30px;padding:16px 28px;font-size:38px;font-weight:700;line-height:1.1}
.opt img,.flag{border-radius:50%;flex:none}
.opt img{width:62px;height:62px}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:38px;font-weight:700}
.swipe{color:oklch(0.68 0.24 318)}
.muted{color:oklch(0.72 0.03 318)}
.answer{display:flex;align-items:center;gap:40px}
.flag{width:180px;height:180px;box-shadow:0 0 0 8px oklch(0.21 0.025 318),12px 12px 0 8px #fdca3a}
.country{font-size:100px;font-weight:800;letter-spacing:-3px;line-height:.95}
.recap{margin-top:56px;font-size:40px;font-weight:600;line-height:1.3;color:oklch(0.72 0.03 318);text-wrap:balance}
.note{margin-top:40px;font-size:46px;font-weight:600;line-height:1.3;text-wrap:pretty}
.cta{background:#fdca3a;color:oklch(0.15 0.04 318);border-radius:36px;padding:36px 48px}
.cta b{display:block;font-size:46px;font-weight:800;letter-spacing:-.5px}
.cta span{display:block;margin-top:6px;font-size:36px;font-weight:600}
h1{font-size:150px;font-weight:800;letter-spacing:-5px;line-height:.9}
.tag{margin-top:44px;font-size:68px;font-weight:700;letter-spacing:-1.5px;color:oklch(0.68 0.24 318)}
.lead{margin-top:28px;font-size:46px;font-weight:600;line-height:1.25;color:oklch(0.72 0.03 318)}
.chips{display:flex;flex-wrap:wrap;gap:16px;margin-top:56px}
.chip{border:3px solid oklch(0.30 0.02 318);border-radius:999px;padding:14px 32px;font-size:36px;font-weight:600;color:oklch(0.72 0.03 318)}
.chip.hi{background:#fdca3a;border-color:#fdca3a;color:oklch(0.15 0.04 318)}
h2{font-size:96px;font-weight:800;letter-spacing:-3px}
.steps{display:flex;flex-direction:column;gap:28px;margin-top:64px}
.step{display:flex;gap:36px;align-items:center;background:oklch(0.21 0.025 318);border-radius:36px;padding:40px 44px;font-size:48px;font-weight:700;line-height:1.2;text-wrap:balance}
.step i{font-style:normal;flex:none;display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:oklch(0.68 0.24 318);font-size:46px;font-weight:800}
`

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="top"><img src="${logo}">Whose Habits</div>
${body}</body></html>`

const cta = (line = 'Play 780+ habits like this with friends') =>
  `<div class="cta"><b>${line}</b><span>whosehabits.com · link in bio</span></div>`

function question(s, options) {
  const opts = options
    .map((c) => `<div class="opt"><img src="${flag(c)}">${NAMES[c]}</div>`)
    .join('')
  return page(`<div class="main">
 <p class="eyebrow" style="margin-bottom:36px">Whose habit is it?</p>
 <div class="card"><p class="habit">${quotes(s.text)}</p></div>
 <div class="grid">${opts}</div>
</div>
<div class="foot"><span class="muted">Guess, then swipe</span><span class="swipe">Answer →</span></div>`)
}

function answer(s) {
  return page(`<div class="main">
 <div class="answer"><img class="flag" src="${flag(s.fits)}"><div><p class="eyebrow">It’s</p><p class="country">${NAMES[s.fits]}</p></div></div>
 <p class="recap">${quotes(s.text)}</p>
 <p class="note">${quotes(s.note)}</p>
</div>
${cta()}`)
}

const intro = [
  page(`<div class="main">
 <h1>Guess<br>whose<br>habit it is.</h1>
 <p class="lead">A party game on your phones, for international friends and anyone curious about other countries.</p>
 <div class="chips"><span class="chip hi">Free</span><span class="chip">No app</span><span class="chip">2–12 players</span></div>
</div>
<div class="foot"><span class="muted">whosehabits.com</span><span class="swipe">How it works →</span></div>`),
  page(`<div class="main">
 <h2>How it works</h2>
 <div class="steps">
  <div class="step"><i>1</i>The host picks 2–6 countries</div>
  <div class="step"><i>2</i>Friends join by link or QR code</div>
  <div class="step"><i>3</i>Everyone gets an everyday habit and guesses whose it is</div>
 </div>
</div>
${cta('Play it free with your friends')}`),
]

const out = join(here, 'out')
mkdirSync(out, { recursive: true })
const only = process.argv.slice(2)
const jobs = []
if (!only.length || only.includes('intro'))
  intro.forEach((h, i) => jobs.push([`intro-${i + 1}`, h]))
const bank = statements()
for (const p of JSON.parse(readFileSync(join(here, 'posts.json'), 'utf8'))) {
  if (only.length && !only.includes(p.id)) continue
  const s = { ...bank.get(p.id), ...p }
  if (!s.text) throw new Error(`No statement ${p.id}`)
  if (s.fits.includes(' ')) throw new Error(`${p.id} fits more than one country`)
  if (!p.options.includes(s.fits)) throw new Error(`${p.id}: options miss the answer`)
  jobs.push([`${p.id}-1`, question(s, p.options)], [`${p.id}-2`, answer(s)])
}
for (const [name, html] of jobs) {
  const file = join(out, `${name}.html`)
  writeFileSync(file, html)
  execFileSync(CHROME, [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1080,1350',
    '--virtual-time-budget=8000',
    `--screenshot=${join(here, `${name}.png`)}`,
    pathToFileURL(file).href,
  ])
  console.log(`${name}.png`)
}
