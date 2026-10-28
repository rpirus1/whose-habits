// Renders a 9:16 Reel (1080×1920, 30 fps, 15 s, no sound) for every post in posts.json
// with a "wrong" pick: the game's question screen with the timer running, a tap on the wrong
// country, the reveal, then a closing screen. Usage: npm run reels [-- id ...]
// --stills saves 4 PNGs per post to out/ instead. Needs `npm install` in this folder (puppeteer-core drives your Chrome; ffmpeg-static encodes).
import { NAMES, flag, logo, posts, quotes, statements } from './shared.mjs'
import { encode, only, withBrowser } from './video.mjs'

const LENGTH = 15 // seconds
const TAP = 3.5 // the tap on the wrong country
const REVEAL = 6.0 // question → reveal
const CTA = 11.5 // reveal → closing screen

const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
const bulb = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`

// The app's dark theme (src/index.css), scaled up about 2.4× from a phone screen.
const CSS = `
:root{--bg:oklch(0.14 0.015 318);--fg:oklch(0.985 0.005 318);--card:oklch(0.21 0.025 318);--muted:oklch(0.26 0.025 318);
 --mfg:oklch(0.72 0.03 318);--primary:oklch(0.68 0.24 318);--border:oklch(0.3 0.02 318);--hi:#fdca3a}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:'Bricolage Grotesque',sans-serif;color:var(--fg);
 background:radial-gradient(1000px 900px at 100% 0%,oklch(0.68 0.24 318 / .26),transparent 70%),var(--bg)}
.hook{position:absolute;left:0;right:0;top:150px;display:flex;justify-content:center}
.hook span{background:var(--hi);color:oklch(0.15 0.04 318);font-size:54px;font-weight:800;letter-spacing:-1px;padding:14px 40px;border-radius:999px}
.screen{position:absolute;left:84px;right:84px;top:310px;height:960px;display:flex;flex-direction:column}
.row{display:flex;justify-content:space-between;align-items:center;font-size:32px;color:var(--mfg)}
.timer{display:flex;align-items:center;gap:28px;margin-top:26px}
.track{flex:1;height:24px;border-radius:99px;background:var(--muted);overflow:hidden}.track i{display:block;height:100%;border-radius:99px;background:var(--primary)}
.secs{width:70px;text-align:right;font-size:46px;font-weight:700}
.label{margin-top:34px;text-align:center;font-size:32px;color:var(--mfg)}
.quote{margin-top:20px;min-height:300px;display:flex;align-items:center;justify-content:center;text-align:center;background:var(--card);border-radius:44px;padding:40px 48px;font-size:50px;font-weight:600;line-height:1.25;text-wrap:balance}
.status{margin-top:auto;text-align:center;font-size:30px;color:var(--mfg)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}
.opt{position:relative;display:flex;align-items:center;gap:24px;min-height:120px;border-radius:40px;border:5px solid transparent;background:var(--card);padding:10px 28px;font-size:40px;font-weight:600;line-height:1.1}
.opt img{width:66px;height:66px;border-radius:50%}
.opt.on{border-color:var(--primary);background:oklch(0.68 0.24 318 / .15)}
.opt .ok{position:absolute;top:18px;right:20px;width:36px;height:36px;color:var(--primary);display:none}.opt.on .ok{display:block}
.ripple{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:oklch(1 0 0 / .35);pointer-events:none}
.idk{margin-top:18px;height:104px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:600}
.badge{background:oklch(0.68 0.24 318 / .18);color:var(--fg);font-weight:600;padding:8px 26px;border-radius:999px}
.result{margin-top:30px;background:var(--card);border-radius:44px;padding:30px;text-align:center}
.result b{display:block;font-size:48px}.result span{display:block;margin-top:6px;font-size:32px;color:var(--mfg)}
.recap{margin-top:44px;text-align:center;font-size:36px;line-height:1.3;color:var(--mfg);text-wrap:balance}
.assoc{margin-top:30px;text-align:center;font-size:30px;color:var(--mfg)}
.answer{margin-top:16px;display:flex;justify-content:center;align-items:center;gap:26px;font-size:74px;font-weight:800;letter-spacing:-1.5px}
.answer img{width:96px;height:96px;border-radius:50%}
.note{margin-top:44px;display:flex;gap:26px;border:3px dashed var(--border);border-radius:44px;padding:34px 38px;font-size:34px;line-height:1.35}
.note svg{flex:none;width:44px;height:44px;color:var(--primary);margin-top:2px}
.cta{align-items:center;justify-content:center;text-align:center}
.cta img{width:170px;height:170px}
.cta h1{margin-top:56px;font-size:96px;font-weight:800;letter-spacing:-3px;line-height:1}
.cta h2{margin-top:36px;font-size:58px;font-weight:700;letter-spacing:-1px;color:var(--primary)}
.cta p{margin-top:22px;font-size:38px;color:var(--mfg)}
.pill{margin-top:60px;background:var(--hi);color:oklch(0.15 0.04 318);font-size:44px;font-weight:800;padding:26px 48px;border-radius:999px}
.cta small{margin-top:40px;font-size:34px;color:var(--mfg)}
`

function html(s, options, wrong) {
  const opt = (c) =>
    `<div class="opt" data-code="${c}"><img src="${flag(c)}">${NAMES[c]}<span class="ok">${check}</span></div>`
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="hook" id="hook"><span></span></div>
<section class="screen" id="q">
 <div class="row"><span>Round 3 of 10</span><span id="answered"></span></div>
 <div class="timer"><div class="track"><i id="bar"></i></div><span class="secs" id="secs"></span></div>
 <p class="label">Where is this most typical?</p>
 <blockquote class="quote">${quotes(s.text)}</blockquote>
 <p class="status" id="status"></p>
 <div class="grid">${options.map(opt).join('')}</div>
 <div class="idk">I don’t know</div>
 <div class="ripple" id="ripple"></div>
</section>
<section class="screen" id="r">
 <div class="row"><span>Round 3 of 10</span><span class="badge">Score: 4</span></div>
 <div class="result"><b>Not quite</b><span>You picked ${NAMES[wrong]}.</span></div>
 <p class="recap">“${quotes(s.text)}”</p>
 <p class="assoc">Most associated with</p>
 <p class="answer" id="answer"><img src="${flag(s.fits)}">${NAMES[s.fits]}</p>
 <p class="note" id="note">${bulb}<span>${quotes(s.note)}</span></p>
</section>
<section class="screen cta" id="c">
 <img src="${logo}">
 <h1>Would you have<br>got it right?</h1>
 <h2>Try it yourself with friends</h2>
 <p>780+ habits · 10 countries · free, no app</p>
 <div class="pill">whosehabits.com · link in bio</div>
 <small>Follow for a new habit every week</small>
</section>
<script>
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
const $ = (id) => document.getElementById(id)
const wrong = document.querySelector('[data-code="${wrong}"]')
function show(el, t0, t1, t) {
  // Fade and slide in at t0, out at t1.
  const a = ease((t - t0) / 0.3) * (1 - ease((t - t1) / 0.3))
  el.style.opacity = a
  el.style.transform = 'translateY(' + (1 - ease((t - t0) / 0.3)) * 40 + 'px)'
}
window.render = (t) => {
  show($('q'), -1, ${REVEAL} - 0.3, t)
  show($('r'), ${REVEAL}, ${CTA} - 0.3, t)
  show($('c'), ${CTA}, 99, t)
  // Hook: one line per scene, popping in.
  const hook = $('hook').firstChild
  hook.textContent = t < ${REVEAL} ? 'Guess before I tap 👀' : t < ${CTA} ? 'Nope 🙈' : ''
  const since = t < ${REVEAL} ? t : t - ${REVEAL}
  $('hook').style.opacity = t < ${CTA} - 0.3 ? 1 - ease((t - (${CTA} - 0.3)) / 0.3) : 0
  hook.style.display = hook.textContent ? 'inline-block' : 'none'
  hook.style.transform = 'scale(' + back(since / 0.35) + ')'
  // Question: a 15 s round, already 3 s in; everyone has answered at 5 s.
  const left = Math.max(0, 12 - t)
  $('bar').style.width = (left / 15) * 100 + '%'
  $('secs').textContent = Math.ceil(left)
  $('answered').textContent = (t < 1.6 ? 1 : t < ${TAP} + 0.2 ? 2 : t < ${REVEAL} - 0.6 ? 3 : 4) + ' of 4 answered'
  const picked = t >= ${TAP} + 0.1
  wrong.classList.toggle('on', picked)
  wrong.style.transform = 'scale(' + (t >= ${TAP} && t < ${TAP} + 0.15 ? 0.96 : 1) + ')'
  $('status').textContent = picked ? 'Answer locked in. You can still change it.' : 'Tap your answer'
  const box = wrong.getBoundingClientRect(), screen = $('q').getBoundingClientRect()
  const r = (t - ${TAP}) / 0.5
  $('ripple').style.left = box.left - screen.left + box.width * 0.62 + 'px'
  $('ripple').style.top = box.top - screen.top + box.height * 0.55 + 'px'
  $('ripple').style.opacity = r >= 0 && r <= 1 ? 1 - r : 0
  $('ripple').style.transform = 'scale(' + (0.4 + ease(r) * 0.9) + ')'
  // Reveal: the answer pops in, then the note.
  $('answer').style.transform = 'scale(' + back((t - ${REVEAL} - 0.5) / 0.45) + ')'
  $('answer').style.opacity = clamp((t - ${REVEAL} - 0.5) / 0.15)
  $('note').style.opacity = ease((t - ${REVEAL} - 1.2) / 0.4)
}
</script></body></html>`
}

const bank = statements()
await withBrowser(async (open) => {
  for (const p of posts()) {
    if (!p.wrong || (only.length && !only.includes(p.id))) continue
    const s = { ...bank.get(p.id), ...p }
    if (p.wrong === s.fits || !p.options.includes(p.wrong)) throw new Error(`${p.id}: bad "wrong"`)
    const page = await open(html(s, p.options, p.wrong))
    await encode(page, p.id, LENGTH, [1, 3.9, 8, 13])
    await page.close()
  }
})
