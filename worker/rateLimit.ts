// Cloudflare's rate limiting binding, one bucket per IP address (limits in wrangler.toml).
// The counters are per Cloudflare location and approximate: enough to stop a flood, not exact.

/** True when the request is within the limit, or when no limiter is bound (tests, local). */
export async function withinLimit(limiter: RateLimit | undefined, request: Request) {
  if (!limiter) return true
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  return (await limiter.limit({ key: ip })).success
}
