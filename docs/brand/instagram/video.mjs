// Shared by the Reel scripts: a page that exposes window.render(t) becomes a 1080×1920 MP4.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'
import puppeteer from 'puppeteer-core'
import { CHROME, here } from './shared.mjs'

export const FPS = 30
export const stills = process.argv.includes('--stills')
export const only = process.argv.slice(2).filter((a) => a !== '--stills')

// Runs fn(open) with a browser; open(html) returns a page whose fonts have loaded.
export async function withBrowser(fn) {
  mkdirSync(join(here, stills ? 'out' : 'reels'), { recursive: true })
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
  try {
    await fn(async (html) => {
      const page = await browser.newPage()
      await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
      await page.setContent(html, { waitUntil: 'networkidle0' })
      await page.evaluate(() => document.fonts.ready)
      return page
    })
  } finally {
    await browser.close()
  }
}

// With --stills: one PNG per time in `checks`, in out/. Otherwise the video, in reels/.
export async function encode(page, name, seconds, checks) {
  if (stills) {
    for (const t of checks) {
      await page.evaluate((t) => window.render(t), t)
      await page.screenshot({ path: join(here, 'out', `${name}-${t}.png`) })
    }
    return console.log(`out/${name}-*.png`)
  }
  const out = join(here, 'reels', `${name}.mp4`)
  const enc = spawn(
    ffmpeg,
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', `${FPS}`, '-i', '-'].concat(
      ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p'],
      ['-movflags', '+faststart', out],
    ),
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const done = new Promise((ok, fail) => enc.on('close', (code) => (code ? fail(code) : ok())))
  for (let f = 0; f < seconds * FPS; f++) {
    await page.evaluate((t) => window.render(t), f / FPS)
    const frame = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!enc.stdin.write(frame)) await new Promise((ok) => enc.stdin.once('drain', ok))
  }
  enc.stdin.end()
  await done
  console.log(`reels/${name}.mp4`)
}
