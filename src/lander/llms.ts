// /llms.txt (https://llmstxt.org): the landing page as plain Markdown, for AI assistants and
// their crawlers. Built from the same copy as the page (content.ts), so the two can't drift.
// Written by scripts/prerender.ts.
import { CULTURES, getCulture, MAX_CULTURES, MIN_CULTURES } from '../content/cultures'
import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from '../game/types'
import { FAQ, SAMPLES, STEPS } from './content'
import { FEEDBACK_EMAIL, INSTAGRAM_URL, LINKEDIN_URL, MAKER_NAME } from './contact'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

export function llmsTxt(): string {
  const countries = CULTURES.map((c) => c.name.replace(/^The /, ''))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .join(', ')
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a free multiplayer party game that runs in the phone browser. Each round shows a small everyday habit, and every player guesses on their own phone which country it comes from. It is made for game nights with international friends, expats and mixed-culture groups, in the same room or over a video call.

- Price: free. No ads, no in-app purchases, no premium version.
- Players: ${MIN_PLAYERS_TO_START} to ${MAX_PLAYERS}, one phone each, the host included.
- Install: none. No app and no account; players type a name.
- Countries: ${countries}. The host picks ${MIN_CULTURES} to ${MAX_CULTURES} for each game.
- Language: English.
- Privacy: no cookies, no ads, no tracking scripts; only anonymous game events are stored.
- Made by ${MAKER_NAME}, a product person in Amsterdam, as a side project.

## How to play

${STEPS.map((s, i) => `${i + 1}. **${s.title}.** ${s.text}`).join('\n')}

## Example habits

${SAMPLES.map(
  (s) => `- "${s.text}" Answer: ${s.fits.map((c) => getCulture(c).name).join(' and ')}. ${s.note}`,
).join('\n')}

## FAQ

${FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n')}

## Links

- [${SITE_NAME}](${SITE_URL}/): the home page, with the rules, examples and FAQ
- [Host a game](${SITE_URL}/new): start a room and share its QR code or link
- [${SITE_NAME} on Instagram](${INSTAGRAM_URL}): the game's Instagram
- [${MAKER_NAME} on LinkedIn](${LINKEDIN_URL}): the maker
- Feedback and questions: ${FEEDBACK_EMAIL}
`
}
