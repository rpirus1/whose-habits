// Confetti for a correct answer at the reveal, in the theme's own colours: orchid (primary),
// sunflower (highlight) and the success green. canvas-confetti loads only when first needed, and
// does nothing for people who ask their OS for reduced motion.

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
  const { default: confetti } = await import('canvas-confetti')
  const rect = from.getBoundingClientRect()
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  }
  const base = { colors: themeColors(), disableForReducedMotion: true, scalar: 0.9, ticks: 160 }
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
