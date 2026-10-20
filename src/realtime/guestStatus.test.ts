import { describe, expect, it } from 'vitest'
import { statusWithoutReply } from './guestStatus'

describe('statusWithoutReply', () => {
  it('blames the link only when this device has never heard from the host', () => {
    expect(statusWithoutReply('joining', false)).toBe('notFound')
    expect(statusWithoutReply('connecting', false)).toBe('notFound')
  })

  it('says the host is away when rejoining a room we played in', () => {
    expect(statusWithoutReply('joining', true)).toBe('hostAway')
    expect(statusWithoutReply('connecting', true)).toBe('hostAway')
  })

  it('leaves a settled status alone', () => {
    expect(statusWithoutReply('in', true)).toBe('in')
    expect(statusWithoutReply('kicked', false)).toBe('kicked')
    expect(statusWithoutReply('full', true)).toBe('full')
  })
})
