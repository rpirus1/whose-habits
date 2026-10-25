import { describe, expect, it } from 'vitest'
import { androidBrowserIntent, inAppBrowser } from './inAppBrowser'

const CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

describe('inAppBrowser', () => {
  it('names the app for Meta and LinkedIn in-app browsers', () => {
    expect(inAppBrowser(`${CHROME} Instagram 350.0.0.0 Android`)).toBe('Instagram')
    expect(inAppBrowser(`${SAFARI} [FBAN/FBIOS;FBAV/480.0]`)).toBe('Facebook')
    expect(inAppBrowser(`${CHROME} [FB_IAB/Orca-Android;FBAV/450.0]`)).toBe('Messenger')
    expect(inAppBrowser(`${SAFARI} [FBAN/MessengerForiOS;FBAV/480.0]`)).toBe('Messenger')
    expect(inAppBrowser(`${SAFARI} LinkedInApp/9.30`)).toBe('LinkedIn')
  })

  it('leaves real browsers alone', () => {
    expect(inAppBrowser(CHROME)).toBeNull()
    expect(inAppBrowser(SAFARI)).toBeNull()
  })
})

describe('androidBrowserIntent', () => {
  it('keeps the path and query, with the page itself as the fallback', () => {
    expect(androidBrowserIntent('https://www.whosehabits.com/r/abcd-efgh?x=1')).toBe(
      'intent://www.whosehabits.com/r/abcd-efgh?x=1#Intent;scheme=https;action=android.intent.action.VIEW;' +
        'S.browser_fallback_url=https%3A%2F%2Fwww.whosehabits.com%2Fr%2Fabcd-efgh%3Fx%3D1;end',
    )
  })
})

describe('inAppBrowser on desktop', () => {
  it('never shows the banner, even with an app name in the user agent', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'
    expect(inAppBrowser(`${mac} [FBAN/FBMacApp]`)).toBeNull()
    expect(inAppBrowser(`${mac} Instagram`)).toBeNull()
  })
})
