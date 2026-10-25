import { ListChecks, Shuffle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MAX_CULTURES, MIN_CULTURES } from '@/content/cultures'
import { CULTURE_CODES } from '@/content/schema'
import { shuffle } from '@/game/random'
import { OPTIONS_PER_ROUND } from '@/game/selection'
import { isRandom } from '@/game/types'
import type { GameMode, Settings } from '@/game/types'

export const MODE_COPY: Record<GameMode, { title: string; line: string; icon: LucideIcon }> = {
  pick: {
    title: 'Choose countries',
    line: `Pick ${MIN_CULTURES}–${MAX_CULTURES}. The same ones every round.`,
    icon: ListChecks,
  },
  random: {
    title: 'Random countries',
    line: `${OPTIONS_PER_ROUND} random countries every round, from all ${CULTURE_CODES.length}.`,
    icon: Shuffle,
  },
}

/** Countries still to pick before the game is valid (0 in random mode). */
export function countriesNeeded(settings: Settings) {
  return isRandom(settings) ? 0 : Math.max(0, MIN_CULTURES - settings.cultures.length)
}

/**
 * Switches mode and keeps the settings playable: back to picking restores the last pick,
 * or fills in random countries when there wasn't one, so the lobby never has too few.
 */
export function withMode(settings: Settings, mode: GameMode): Settings {
  if (mode === 'random' || settings.cultures.length >= MIN_CULTURES) return { ...settings, mode }
  const picked = shuffle(CULTURE_CODES, Math.random).slice(0, OPTIONS_PER_ROUND)
  return { ...settings, mode, cultures: CULTURE_CODES.filter((c) => picked.includes(c)) }
}
