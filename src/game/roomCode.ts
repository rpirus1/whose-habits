// Consonants only: no vowels means no accidental words, and no I/L/O look-alikes.
export const ROOM_CODE_ALPHABET = 'BCDFGHJKMNPQRSTVWXZ'
export const ROOM_CODE_LENGTH = 4

export function generateRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)]
  }
  return code
}

/** Normalises user input ("bcdf", " B C D F ") and returns null if it can't be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/\s+/g, '')
  const valid = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)
  return valid.test(code) ? code : null
}
