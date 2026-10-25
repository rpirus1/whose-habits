// Leaving the browsers built into social apps (see InAppBrowserBanner).

/** The app whose built-in browser this is, from its user agent, or null for a real browser. */
export function inAppBrowser(userAgent: string): string | null {
  // Phones and tablets only: a desktop browser never needs the banner.
  if (!/Android|iPhone|iPad|iPod/i.test(userAgent)) return null
  if (/Orca-Android|MessengerForiOS|MessengerLiteForiOS/i.test(userAgent)) return 'Messenger'
  if (/Instagram/i.test(userAgent)) return 'Instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'Facebook'
  if (/LinkedInApp/i.test(userAgent)) return 'LinkedIn'
  return null
}

/**
 * An Android intent that opens the page in the default browser, leaving the app's own one.
 * Where the app refuses it, the fallback URL simply reloads the page where it is.
 */
export function androidBrowserIntent(href: string): string {
  const url = new URL(href)
  const fallback = encodeURIComponent(url.href)
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(':', '')};action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`
}
