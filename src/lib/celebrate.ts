// Confetti for a correct answer at the reveal, in the theme's own colours: orchid (primary),
// sunflower (highlight) and the success green. canvas-confetti loads only when first needed, and
// does nothing for people who ask their OS for reduced motion.
//
// It draws on our own canvas, on the main thread. By default canvas-confetti draws in a Web
// Worker made from a blob: URL, which the site's Content Security Policy blocks (no worker-src
// blob:), so on the live site nothing appeared. Localhost has no CSP, which hid it.
import type { CreateTypes } from 'canvas-confetti'

let cannon: CreateTypes | undefined

/** One full-screen canvas over the page, made on first use and kept for later reveals. */
async function getCannon(): Promise<CreateTypes> {
  if (cannon) return cannon
  const { default: confetti } = await import('canvas-confetti')
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '100',
  })
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  cannon = confetti.create(canvas, {
    resize: true,
    useWorker: false,
    disableForReducedMotion: true,
  })
  return cannon
}

const COLOR_TOKENS = ['--primary', '--highlight', '--success']

/** The theme tokens as hex: canvas-confetti only takes hex, the tokens are oklch. */
function themeColors(): string[] {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  const style = getComputedStyle(document.documentElement)
  return COLOR_TOKENS.map((token) => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = style.getPropertyValue(token).trim()
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
  })
}

/**
 * One burst from the element (the result card), or two from the sides as well with the bonus
 * point: a richer moment for the fastest right answer.
 */
export async function celebrate(from: Element, bonus: boolean) {
  const confetti = await getCannon()
  const rect = from.getBoundingClientRect()
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  }
  const base = { colors: themeColors(), scalar: 0.9, ticks: 160 }
  confetti({ ...base, origin, particleCount: bonus ? 90 : 50, spread: 70, startVelocity: 32 })
  if (!bonus) return
  window.setTimeout(() => {
    for (const x of [0, 1]) {
      confetti({
        ...base,
        origin: { x, y: 0.7 },
        angle: x ? 120 : 60,
        particleCount: 45,
        spread: 55,
        startVelocity: 45,
      })
    }
  }, 250)
}
