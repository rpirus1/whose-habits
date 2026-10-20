// Shared by the app and by scripts/build-statements.ts (run with plain Node),
// so this file and cultures.ts use relative imports with .ts extensions only.

export const CULTURE_CODES = ['PL', 'UA', 'NL', 'BR', 'MX', 'US', 'TR', 'IT', 'FR', 'KR'] as const
export type CultureCode = (typeof CULTURE_CODES)[number]

export const TOPICS = ['daily', 'hosting', 'family', 'humour', 'work', 'language'] as const
export type Topic = (typeof TOPICS)[number]

export type Obviousness = 1 | 2 | 3

export interface Statement {
  /** Stable, never reused. Prefix = the culture it was written for, e.g. "nl-007". */
  id: string
  text: string
  /** Every culture the statement fits. In a game it is used only if exactly one selected culture is here. */
  fits: CultureCode[]
  /** One line shown at the reveal, so a wrong answer still teaches something. */
  note: string
  /** 1 = most people get it, 3 = insider knowledge. */
  obviousness: Obviousness
  topic: Topic
  reviewed: boolean
}
