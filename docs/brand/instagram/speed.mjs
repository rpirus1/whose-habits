// Renders "speed round" Reels from speed.json: 3 habits, about 3 seconds each, the answer
// flashes green with a reaction, then "How many did you get? Comment your score".
// Fast cuts and a score to comment are what make people rewatch and reply.
// Usage: npm run speed [-- name ...] (--stills for preview PNGs in out/).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NAMES, flag, here, logo, quotes, statements } from './shared.mjs'
import { encode, only, withBrowser } from './video.mjs'

const ASK = 3.5 // seconds to answer
const SHOW = 1.2 // the answer on screen
const ROUND = ASK + SHOW
const END = 3.2 // closing screen
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

// Emoji come from Noto Color Emoji (SIL Open Font License), so the video is free to publish.
const CSS = `
:root{--bg:oklch(0.14 0.015 318);--fg:oklch(0.985 0.005 318);--card:oklch(0.21 0.025 318);--muted:oklch(0.26 0.025 318);
 --mfg:oklch(0.72 0.03 318);--primary:oklch(0.68 0.24 318);--ok:oklch(0.7113 0.2043 140.81);--bad:oklch(0.68 0.2 25);--hi:#fdca3a;--ink:oklch(0.15 0.04 318)}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:'Bricolage Grotesque','Noto Color Emoji',sans-serif;color:var(--fg);
 background:radial-gradient(1000px 900px at 100% 0%,oklch(0.68 0.24 318 / .26),transparent 70%),var(--bg)}
.e{font-family:'Noto Color Emoji'}
.hook{position:absolute;left:0;right:0;top:140px;display:flex;flex-direction:column;align-items:center;gap:26px}
.hook b{background:var(--hi);color:var(--ink);font-size:58px;font-weight:800;letter-spacing:-1px;padding:14px 44px;border-radius:999px}
.dots{display:flex;gap:16px}.dots i{width:64px;height:12px;border-radius:99px;background:var(--muted)}.dots i.on{background:var(--hi)}
.round{position:absolute;left:84px;right:84px;top:380px;height:900px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:28px}
.track{flex:1;height:26px;border-radius:99px;background:var(--muted);overflow:hidden}.track i{display:block;height:100%;border-radius:99px}
.num svg{width:56px;height:56px}
.num{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font-size:58px;font-weight:800;background:var(--card)}
.card{position:relative;margin-top:34px;min-height:330px;display:flex;align-items:center;justify-content:center;text-align:center;background:var(--card);border-radius:48px;padding:44px 52px;font-size:56px;font-weight:700;line-height:1.2;letter-spacing:-.5px;text-wrap:balance;box-shadow:16px 16px 0 var(--hi)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:52px}
.opt{position:relative;display:flex;align-items:center;gap:24px;min-height:128px;border-radius:40px;border:6px solid transparent;background:var(--card);padding:10px 28px;font-size:42px;font-weight:700;line-height:1.1}
.opt img{width:70px;height:70px;border-radius:50%}
.opt.ok{border-color:var(--ok);background:oklch(0.7113 0.2043 140.81 / .18)}
.opt .tick{position:absolute;top:-26px;right:-14px;width:72px;height:72px;border-radius:50%;background:var(--ok);color:var(--ink);display:none;place-items:center}
.opt.ok .tick{display:grid}.opt .tick svg{width:44px;height:44px}
.react{position:absolute;left:0;right:0;top:-70px;display:flex;justify-content:center}
.react span{background:var(--fg);color:var(--ink);font-size:52px;font-weight:800;padding:12px 40px;border-radius:999px;box-shadow:0 12px 40px oklch(0 0 0 / .5)}
.end{position:absolute;left:84px;right:84px;top:380px;height:900px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.end h1{font-size:104px;font-weight:800;letter-spacing:-3px;line-height:1}
.scores{display:flex;gap:22px;margin-top:56px}
.scores span{width:150px;height:150px;border-radius:36px;display:grid;place-items:center;background:var(--card);font-size:80px;font-weight:800}
.scores span:last-child{background:var(--hi);color:var(--ink)}
.end h2{margin-top:52px;font-size:60px;font-weight:700;color:var(--primary)}
.pill{margin-top:64px;display:flex;align-items:center;gap:22px;background:var(--card);border-radius:999px;padding:18px 40px 18px 18px;font-size:40px;font-weight:700}
.pill img{width:84px;height:84px}
.pill small{display:block;font-size:30px;font-weight:600;color:var(--mfg)}
`

function html(rounds) {
  const round = (r, i) => `
<section class="round" id="r${i}">
 <div class="top"><div class="track"><i></i></div><span class="num"></span></div>
 <div class="card">${quotes(r.text)}<div class="react"><span>${r.react}</span></div></div>
 <div class="grid">${r.options
   .map(
     (c) =>
       `<div class="opt" data-ok="${c === r.fits}"><img src="${flag(c)}">${NAMES[c]}<span class="tick">${check}</span></div>`,
   )
   .join('')}</div>
</section>`
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Noto+Color+Emoji&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="hook"><b>Can you get 3/3? <span class="e">⏱️</span></b><div class="dots">${rounds.map(() => '<i></i>').join('')}</div></div>
${rounds.map(round).join('')}
<section class="end" id="end">
 <h1>How many<br>did you get?</h1>
 <div class="scores"><span>0</span><span>1</span><span>2</span><span>3</span></div>
 <h2>Comment your score <span class="e">👇</span></h2>
 <div class="pill"><img src="${logo}"><div>Play 780+ habits with friends<small>whosehabits.com · link in bio</small></div></div>
</section>
<script>
const ROUND = ${ROUND}, ASK = ${ASK}, N = ${rounds.length}, CHECK = '${check}'
const clamp = (x) => Math.max(0, Math.min(1, x))
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3)
const back = (x) => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
window.render = (t) => {
  document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', t >= i * ROUND + ASK))
  for (let i = 0; i < N; i++) {
    const el = document.getElementById('r' + i), local = t - i * ROUND
    const visible = local >= 0 && local < ROUND
    el.style.display = visible ? 'flex' : 'none'
    if (!visible) continue
    // Whoosh in from the right (not the first round: frame 1 must already show a habit).
    const enter = i === 0 ? 1 : ease(local / 0.25)
    el.style.transform = 'translateX(' + (1 - enter) * 700 + 'px)'
    el.style.opacity = enter
    const left = Math.max(0, ASK - local), urgent = left < 1.2
    const bar = el.querySelector('.track i')
    bar.style.width = (left / ASK) * 100 + '%'
    bar.style.background = urgent ? 'var(--bad)' : 'var(--primary)'
    const num = el.querySelector('.num')
    if (left > 0) num.textContent = Math.min(3, Math.ceil(left))
    else if (!num.querySelector('svg')) num.innerHTML = CHECK
    el.querySelector('.track').style.opacity = 1 - ease((local - ASK) / 0.15)
    num.style.background = left > 0 ? (urgent ? 'var(--bad)' : 'var(--card)') : 'var(--ok)'
    num.style.color = left > 0 ? 'var(--fg)' : 'var(--ink)'
    num.style.transform = 'scale(' + (left > 0 ? 1 + 0.18 * (1 - ease((1 - (left % 1)) / 0.3)) : back((local - ASK) / 0.3)) + ')'
    const shown = local >= ASK, since = local - ASK
    el.querySelectorAll('.opt').forEach((o) => {
      const ok = o.dataset.ok === 'true'
      o.classList.toggle('ok', shown && ok)
      o.style.opacity = shown && !ok ? 1 - 0.7 * ease(since / 0.2) : 1
      o.style.transform = 'scale(' + (shown && ok ? back(since / 0.35) * 0.06 + 1 - 0.06 * ease((since - 0.35) / 0.3) : 1) + ')'
    })
    const react = el.querySelector('.react span')
    react.style.opacity = shown ? clamp(since / 0.1) : 0
    react.style.transform = 'rotate(-4deg) scale(' + back((since - 0.1) / 0.35) + ')'
  }
  const end = document.getElementById('end'), local = t - N * ROUND
  end.style.display = local >= 0 ? 'flex' : 'none'
  end.style.opacity = ease(local / 0.25)
  end.style.transform = 'scale(' + (0.92 + 0.08 * ease(local / 0.3)) + ')'
  end.querySelectorAll('.scores span').forEach((s, i) => (s.style.transform = 'scale(' + back((local - 0.25 - i * 0.1) / 0.3) + ')'))
}
</script></body></html>`
}

const bank = statements()
const reels = JSON.parse(readFileSync(join(here, 'speed.json'), 'utf8'))
await withBrowser(async (open) => {
  for (const reel of reels) {
    if (only.length && !only.includes(reel.name)) continue
    const rounds = reel.rounds.map((r) => {
      const s = { ...bank.get(r.id), ...r }
      if (!s.text || s.fits.includes(' ') || !r.options.includes(s.fits))
        throw new Error(`${r.id}: needs one country, among the options`)
      return s
    })
    const page = await open(html(rounds))
    const length = rounds.length * ROUND + END
    await encode(page, reel.name, length, [0, 1.5, ASK + 0.6, ROUND + 0.1, length - 1])
    await page.close()
  }
})
