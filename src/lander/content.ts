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
