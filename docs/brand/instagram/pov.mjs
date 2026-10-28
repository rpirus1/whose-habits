// Renders "POV: game night" Reels from pov.json: 4 friends vote on one habit, the confident
// ones are wrong, the friend from that country quietly gets it, everyone reacts, then
// "Tag the friend who'd get this wrong". Shows that the game is social, not a solo quiz.
// Usage: npm run pov [-- name ...] (--stills for preview PNGs in out/).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NAMES, flag, here, logo, quotes, statements } from './shared.mjs'
import { encode, only, withBrowser } from './video.mjs'

const VOTES = 1.0 // first vote; then one every 0.9 s
const REVEAL = 6.4
const CTA = 11.6
const LENGTH = 15

// Emoji come from Noto Color Emoji (SIL Open Font License), so the video is free to publish.
const CSS = `
:root{--bg:oklch(0.14 0.015 318);--fg:oklch(0.985 0.005 318);--card:oklch(0.21 0.025 318);--muted:oklch(0.26 0.025 318);
 --mfg:oklch(0.72 0.03 318);--primary:oklch(0.68 0.24 318);--ok:oklch(0.7113 0.2043 140.81);--hi:#fdca3a;--ink:oklch(0.15 0.04 318)}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:'Bricolage Grotesque','Noto Color Emoji',sans-serif;color:var(--fg);
 background:radial-gradient(1000px 900px at 100% 0%,oklch(0.68 0.24 318 / .26),transparent 70%),var(--bg)}
.e{font-family:'Noto Color Emoji'}
.hook{position:absolute;left:90px;right:90px;top:130px;display:flex;justify-content:center}
.hook b{background:var(--hi);color:var(--ink);font-size:50px;font-weight:800;letter-spacing:-1px;line-height:1.1;padding:18px 40px;border-radius:44px;text-align:center;text-wrap:balance}
.stage{position:absolute;left:70px;right:70px;top:360px;height:940px}
.label{text-align:center;font-size:34px;color:var(--mfg)}
.card{position:relative;margin-top:18px;height:290px;background:var(--card);border-radius:48px;box-shadow:16px 16px 0 var(--hi)}
.card>div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px 56px}
.habit{font-size:56px;font-weight:700;line-height:1.2;letter-spacing:-.5px;text-wrap:balance}
.answer{gap:18px}
.answer p{display:flex;align-items:center;gap:26px;font-size:84px;font-weight:800;letter-spacing:-2px}
.answer img{width:100px;height:100px;border-radius:50%}
.answer small{font-size:34px;font-weight:600;line-height:1.3;color:var(--mfg);text-wrap:balance}
.players{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:70px}
.p{display:flex;flex-direction:column;align-items:center}
.av{position:relative;width:170px;height:170px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-size:104px;line-height:1;border:6px solid transparent}
.av.win{border-color:var(--ok)}
.av img{position:absolute;right:-4px;bottom:-4px;width:58px;height:58px;border-radius:50%;border:5px solid var(--bg)}
.name{margin-top:14px;font-size:36px;font-weight:700}
.bubble{position:relative;margin-top:30px;min-height:120px;width:228px;background:var(--fg);color:var(--ink);border-radius:30px;padding:16px 16px;text-align:center;font-size:31px;font-weight:700;line-height:1.15;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.bubble:before{content:'';position:absolute;top:-16px;left:50%;margin-left:-16px;border:16px solid transparent;border-top:0;border-bottom-color:var(--fg)}
.bubble img{width:46px;height:46px;border-radius:50%}
.plus{position:absolute;top:-20px;left:-10px;background:var(--ok);color:var(--ink);font-size:36px;font-weight:800;padding:6px 18px;border-radius:999px}
.cta{position:absolute;left:84px;right:84px;top:360px;height:940px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.cta .faces{font-size:120px;letter-spacing:10px}
.cta h1{margin-top:40px;font-size:96px;font-weight:800;letter-spacing:-3px;line-height:1}
.cta h2{margin-top:40px;font-size:52px;font-weight:700;color:var(--primary);text-wrap:balance}
.pill{margin-top:64px;display:flex;align-items:center;gap:22px;background:var(--card);border-radius:999px;padding:18px 40px 18px 18px;font-size:40px;font-weight:700;text-align:left}
.pill img{width:84px;height:84px}
.pill small{display:block;font-size:30px;font-weight:600;color:var(--mfg)}
`

function html(r) {
  const player = (p, i) => `
<div class="p" id="p${i}">
 <div class="av"><span class="face e">${p.face}</span><img src="${flag(p.from)}">${p.vote === r.fits ? '<span class="plus">+1</span>' : ''}</div>
 <p class="name">${p.name}</p>
 <div class="bubble"><img src="${flag(p.vote)}"><span class="say">${p.say}</span></div>
</div>`
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Noto+Color+Emoji&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="hook"><b>${r.hook} <span class="e">🌍</span></b></div>
<section class="stage" id="stage">
 <p class="label" id="label">Whose habit is it?</p>
 <div class="card">
  <div class="habit" id="habit">${quotes(r.text)}</div>
  <div class="answer" id="answer"><p><img src="${flag(r.fits)}">${NAMES[r.fits]}</p><small>${quotes(r.fact ?? r.note)}</small></div>
 </div>
 <div class="players">${r.players.map(player).join('')}</div>
</section>
<section class="cta" id="cta">
 <div class="faces e">${r.players.map((p) => p.react).join('')}</div>
 <h1>Tag the friend<br>who’d get<br>this wrong <span class="e">👇</span></h1>
 <h2>Then play it together</h2>
 <div class="pill"><img src="${logo}"><div>Free party game, no app<small>whosehabits.com · link in bio</small></div></div>
</section>
<script>
const P = ${JSON.stringify(r.players.map((p) => ({ face: p.face, react: p.react, say: p.say, after: p.after, win: p.vote === r.fits })))}
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const back = (x) => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
const $ = (id) => document.getElementById(id)
window.render = (t) => {
  const out = ease((t - ${CTA}) / 0.3)
  $('stage').style.opacity = 1 - out
  $('stage').style.transform = 'scale(' + (1 - 0.06 * out) + ')'
  $('cta').style.opacity = out
  $('cta').style.transform = 'translateY(' + (1 - out) * 60 + 'px)'
  $('cta').querySelector('.faces').style.transform = 'scale(' + back((t - ${CTA} - 0.2) / 0.4) + ')'
  // The habit gives way to the answer, with a pop.
  const rev = t - ${REVEAL}
  $('habit').style.opacity = 1 - clamp(rev / 0.15)
  $('answer').style.opacity = clamp(rev / 0.15)
  $('answer').querySelector('p').style.transform = 'scale(' + back(rev / 0.4) + ')'
  $('label').textContent = rev < 0 ? 'Whose habit is it?' : 'It’s…'
  P.forEach((p, i) => {
    const el = $('p' + i), at = ${VOTES} + i * 0.9 + (p.win ? 0.5 : 0)
    // Each friend locks in a guess with a speech bubble; at the reveal they all react.
    const bubble = el.querySelector('.bubble'), say = bubble.querySelector('.say'), flagImg = bubble.querySelector('img')
    bubble.style.opacity = clamp((t - at) / 0.1)
    bubble.style.transform = 'scale(' + back((t - at) / 0.3) + ')'
    const after = rev >= 0.35 + i * 0.12
    say.textContent = after ? p.after : p.say
    // The quiet friend's guess stays hidden until the reveal.
    flagImg.style.display = p.win && rev < 0 ? 'none' : 'block'
    flagImg.style.opacity = after && !p.win ? 0.35 : 1
    el.querySelector('.face').textContent = after ? p.react : p.face
    const av = el.querySelector('.av')
    av.classList.toggle('win', after && p.win)
    av.style.transform = 'scale(' + (after ? 0.9 + 0.1 * back((rev - 0.35 - i * 0.12) / 0.35) : 1) + ') rotate(' + (after && !p.win ? Math.sin((t - ${REVEAL}) * 30) * 4 * (1 - ease((rev - 0.35) / 0.8)) : 0) + 'deg)'
    const plus = el.querySelector('.plus')
    if (plus) { plus.style.opacity = after ? 1 : 0; plus.style.transform = 'scale(' + back((rev - 0.7) / 0.35) + ')' }
  })
}
</script></body></html>`
}

const bank = statements()
const reels = JSON.parse(readFileSync(join(here, 'pov.json'), 'utf8'))
await withBrowser(async (open) => {
  for (const reel of reels) {
    if (only.length && !only.includes(reel.name)) continue
    const r = { ...bank.get(reel.id), ...reel }
    if (!r.text || r.fits.includes(' ')) throw new Error(`${reel.id}: needs one country`)
    if (!r.players.some((p) => p.vote === r.fits)) throw new Error(`${reel.name}: nobody gets it`)
    const page = await open(html(r))
    await encode(page, reel.name, LENGTH, [0, 4.5, 7.6, 13])
    await page.close()
  }
})
