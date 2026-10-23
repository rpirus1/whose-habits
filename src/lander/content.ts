// Copy for the landing page. The FAQ feeds the page, its FAQPage JSON-LD and llms.txt, so they
// can't drift. Sample statements are copied from content/statements.csv; a test checks they
// still match it.
import type { CultureCode } from '../content/schema.ts'
import { FEEDBACK_EMAIL } from './contact.ts'

export interface Sample {
  id: string
  text: string
  fits: CultureCode[]
  note: string
}

/** Hard ones (obviousness 3), so the game looks like a challenge. */
export const SAMPLES: readonly Sample[] = [
  {
    id: 'nl-017',
    text: 'Gifts come with a rhyming poem that gently roasts the person who receives them.',
    fits: ['NL'],
    note: "Around 5 December, 'surprises' come with a Sinterklaas poem; everyone reads theirs aloud, and the teasing is half the fun.",
  },
  {
    id: 'tr-022',
    text: "Right after the vows, bride and groom race to step on each other's foot first.",
    fits: ['TR'],
    note: "Whoever steps first will 'have the last word' in the marriage.",
  },
  {
    id: 'br-027',
    text: 'Office workers brush their teeth in the office bathroom after lunch.',
    fits: ['BR', 'KR'],
    note: 'Brushing after every meal is a strong habit in Brazil and Korea, so desks hide toothbrush kits and office sinks get busy around 1 pm.',
  },
]

/** The example question in the hero, with three plausible wrong options. */
export const HERO_QUESTION: Sample & { options: readonly CultureCode[] } = {
  id: 'br-010',
  text: 'Visitors at a house with a gate clap their hands to call the owner instead of knocking.',
  fits: ['BR'],
  note: "'Bater palmas' (clapping) works when the door is far behind a wall or gate; doorbells were long a luxury.",
  options: ['MX', 'BR', 'IT', 'TR'],
}

/** How to play, in three steps (the page pairs each with a picture). */
export const STEPS: readonly { title: string; text: string }[] = [
  {
    title: 'Host a game',
    text: 'Pick 2 to 6 countries, the number of rounds and the time per question.',
  },
  {
    title: 'Friends join',
    text: 'They scan the QR code or open the link on their own phone. No app, no account.',
  },
  {
    title: 'Guess and score',
    text: 'Read the habit, pick the country. A point for every right answer, a bonus for the first one in.',
  },
]

export interface Faq {
  q: string
  a: string
}

export const FAQ: readonly Faq[] = [
  {
    q: 'Is it free? Do we need an app?',
    a: 'Free, with no ads, no in-app purchases and no premium version. It runs in the browser on any phone: no app, no sign-up, just type a name.',
  },
  {
    q: 'Who can play?',
    a: 'From 2 to 12 players, each on their own phone, the host included. Everyone answers at the same time.',
  },
  {
    q: 'How do my friends join?',
    a: 'The host gets a QR code and a link to share. Friends scan it or open the link. They can also type the room code on this page.',
  },
  {
    q: 'Can we play over a video call?',
    a: 'Yes. Share the link in the chat and everyone plays on their own phone, wherever they are.',
  },
  {
    q: 'Which countries are in it?',
    a: 'Brazil, France, Italy, Mexico, the Netherlands, Poland, South Korea, Türkiye, Ukraine and the United States. The host picks 2 to 6 of them for each game. More countries are coming. The game is in English for now.',
  },
  {
    q: 'Can a habit belong to more than one country?',
    a: 'Many do. A habit only comes up when exactly one of the countries in your game fits it, so there is always one right answer.',
  },
  {
    q: 'Are the habits true for everyone?',
    a: 'No. Each one is a habit people most associate with a country, not something everyone there does. They are about small everyday things, like how people greet, shop, host and celebrate, and stay away from politics, religion, appearance and anything that ranks countries. I research and polish them with help from AI, and your reports are how they get better.',
  },
  {
    q: 'A habit feels wrong. How can I report it?',
    a: `Tap Report on the answer screen and pick what’s wrong, or write to ${FEEDBACK_EMAIL} with the statement and what you’d change. I read every report, and statements get fixed or removed.`,
  },
]
