import { describe, expect, it } from 'vitest'
import { generateRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET } from './roomCode'

describe('generateRoomCode', () => {
  it('makes 12 characters in groups of four from the safe alphabet', () => {
    const code = generateRoomCode()
    expect(code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]{4}(-[${ROOM_CODE_ALPHABET}]{4}){2}$`))
  })

  it('does not repeat', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateRoomCode()))
    expect(codes.size).toBe(1000)
  })

  it('skips bytes that would bias the alphabet', () => {
    // 248+ are rejected for a 31-letter alphabet; 0 maps to the first letter.
    let call = 0
    const bytes = (n: number) => new Uint8Array(n).fill(call++ === 0 ? 255 : 0)
    expect(generateRoomCode(bytes)).toBe('2222-2222-2222')
  })
})

describe('normalizeRoomCode', () => {
  it('accepts typed variants and returns the canonical form', () => {
    expect(normalizeRoomCode('K7M2X9QP4TDV')).toBe('k7m2-x9qp-4tdv')
    expect(normalizeRoomCode(' k7m2 x9qp-4tdv ')).toBe('k7m2-x9qp-4tdv')
  })

  it('rejects wrong lengths and look-alike characters', () => {
    expect(normalizeRoomCode('BCDF')).toBeNull()
    expect(normalizeRoomCode('k7m2-x9qp-4td0')).toBeNull()
    expect(normalizeRoomCode('k7m2-x9qp-4tdv-a')).toBeNull()
  })
})
