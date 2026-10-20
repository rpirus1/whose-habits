// Where the site lives and how to reach its maker. Switching to the real domain is one line
// in .env (VITE_SITE_URL); canonical, og:url, sitemap, robots and JSON-LD all follow.
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://culture-clash.ruslan-pirus.workers.dev'
).replace(/\/+$/, '')

export const SITE_NAME = 'Whose Habits'
export const SITE_TITLE = 'Whose Habits: a free party game for international friends'
export const SITE_DESCRIPTION =
  'Guess which country an everyday habit comes from. A free culture quiz for expat game nights and international friends. No app, no sign-up, one phone each.'
