// Head tags only the prerendered landing page gets: canonical, robots, author and JSON-LD. The shared tags
// (title, description, Open Graph) live in index.html, so room links keep their previews.
import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from '../game/types'
import { FAQ } from './content'
import { LINKEDIN_URL, MAKER_NAME } from './contact'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

export function structuredData() {
  const url = `${SITE_URL}/`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${url}#website`, name: SITE_NAME, url, inLanguage: 'en' },
      {
        '@type': 'VideoGame',
        '@id': `${url}#game`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url,
        image: `${SITE_URL}/og-image.png`,
        genre: ['Party game', 'Trivia'],
        gamePlatform: 'Web browser',
        applicationCategory: 'Game',
        operatingSystem: 'Any',
        playMode: 'MultiPlayer',
        numberOfPlayers: {
          '@type': 'QuantitativeValue',
          minValue: MIN_PLAYERS_TO_START,
          maxValue: MAX_PLAYERS,
        },
        inLanguage: 'en',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
        author: { '@type': 'Person', name: MAKER_NAME, sameAs: [LINKEDIN_URL] },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }
}

export function headTags(): string {
  // "<" escaped so no string in the data can close the script tag.
  const json = JSON.stringify(structuredData()).replace(/</g, '\u003c')
  return [
    `<link rel="canonical" href="${SITE_URL}/" />`,
    // Lets Google show the large share image and full snippets in results.
    '<meta name="robots" content="max-image-preview:large, max-snippet:-1" />',
    // LinkedIn's Post Inspector reads the author from here.
    `<meta name="author" content="${MAKER_NAME}" />`,
    `<script type="application/ld+json">${json}</script>`,
  ].join('\n    ')
}
