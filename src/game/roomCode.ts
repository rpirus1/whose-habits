// Room ids are the only thing that protects a room: anyone who knows one can join.
// So they are long and random (12 characters ≈ 59 bits), shared as a link or QR code,
// and grouped in fours so they can still be typed in a pinch: "k7m2-x9qp-4tdv".

/** Lowercase letters and digits without look-alikes (0/o, 1/l/i). */
export const ROOM_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
export const ROOM_CODE_LENGTH = 12
const GROUP = 4

export function generateRoomCode(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % ROOM_CODE_ALPHABET.length)
  let raw = ''
  while (raw.length < ROOM_CODE_LENGTH) {
    for (const byte of randomBytes(ROOM_CODE_LENGTH)) {
      if (byte < limit && raw.length < ROOM_CODE_LENGTH) {
        raw += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]
      }
    }
  }
  return format(raw)
}

/** Accepts any case, spaces or dashes; returns the canonical "xxxx-xxxx-xxxx" or null. */
export function normalizeRoomCode(input: string): string | null {
  const raw = input.toLowerCase().replace(/[\s-]+/g, '')
  const valid = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`)
  return valid.test(raw) ? format(raw) : null
}

function format(raw: string): string {
  return raw.match(new RegExp(`.{1,${GROUP}}`, 'g'))!.join('-')
}
