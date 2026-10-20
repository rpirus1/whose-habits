// Copy for the landing page. The FAQ feeds both the page and its FAQPage JSON-LD, so the two
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

export const SAMPLES: readonly Sample[] = [
  {
    id: 'nl-038',
    text: 'The lock on a bike is often worth more than the bike itself.',
    fits: ['NL'],
    note: 'People ride cheap old bikes with heavy locks because bike theft is so common, and the bike still gets stolen.',
  },
  {
    id: 'br-001',
    text: 'Arriving 30 minutes late to a house party is normal; arriving on time can feel awkward.',
    fits: ['BR', 'MX'],
    note: 'Party start times are loose, and hosts are often still getting ready at the stated time.',
  },
  {
    id: 'kr-013',
    text: 'Couples celebrate their 100th day together, and often the 200th and 300th too.',
    fits: ['KR'],
    note: "Couples count days, not months; 'baegil' (100 days) brings gifts, letters and often matching rings.",
  },
]

/** The example question in the hero: the first sample, with three wrong options. */
export const HERO_OPTIONS: readonly CultureCode[] = ['NL', 'IT', 'KR', 'BR']

export interface Faq {
  q: string
  a: string
}

export const FAQ: readonly Faq[] = [
  {
    q: 'Is it really free?',
    a: 'Yes. No ads, no in-app purchases, no premium version.',
  },
  {
    q: 'Do we need to download an app or sign up?',
    a: 'No. It runs in the browser on any phone. Type a name and you are in.',
  },
  {
    q: 'Does everyone need a phone?',
    a: 'Yes, one each, the host included. Everyone answers on their own phone at the same time.',
  },
  {
    q: 'How many people can play?',
    a: 'From 2 to 12 players in one game.',
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
    a: 'Brazil, France, Italy, Mexico, the Netherlands, Poland, South Korea, Türkiye, Ukraine and the United States. The host picks 2 to 6 of them for each game. More countries are coming.',
  },
  {
    q: 'Can a habit belong to more than one country?',
    a: 'Many do. A habit only comes up when exactly one of the countries in your game fits it, so there is always one right answer.',
  },
  {
    q: 'Isn’t this about stereotypes?',
    a: 'It is about small everyday things: how people greet, shop, host and celebrate. The game stays away from politics, religion, appearance and national clichés.',
  },
  {
    q: 'I don’t agree with a statement. How can I report it?',
    a: `Tap Report on the answer screen during the game, or write to ${FEEDBACK_EMAIL} with the statement and what you’d change. Every report gets read, and statements get fixed or removed.`,
  },
  {
    q: 'What language is it in?',
    a: 'English, for now.',
  },
]
