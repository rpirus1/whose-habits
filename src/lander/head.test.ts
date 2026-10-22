import { describe, expect, it } from 'vitest'
import { FAQ } from './content'
import { headTags, structuredData } from './head'
import { formatTypedCode, parseJoinInput } from './join'

describe('landing page head', () => {
  it('puts every FAQ entry into the FAQPage JSON-LD', () => {
    const faq = structuredData()['@graph'].find((n) => n['@type'] === 'FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[]
    }
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      FAQ.map(({ q, a }) => [q, a]),
    )
  })

  it('writes a canonical and JSON-LD that cannot close its script tag', () => {
    const tags = headTags()
    expect(tags).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/" \/>/)
    expect(tags.match(/<\/script>/g)).toHaveLength(1)
  })
})

describe('parseJoinInput', () => {
  it('accepts a code in any case and spacing, or a pasted room link', () => {
    expect(parseJoinInput(' K7M2 x9qp-4TDV ')).toBe('k7m2-x9qp-4tdv')
    expect(parseJoinInput('https://whosehabits.com/r/k7m2-x9qp-4tdv?x=1')).toBe('k7m2-x9qp-4tdv')
  })

  it('rejects anything else', () => {
    expect(parseJoinInput('k7m2')).toBeNull()
    expect(parseJoinInput('')).toBeNull()
    expect(parseJoinInput(null)).toBeNull()
  })
})

describe('formatTypedCode', () => {
  it('adds dashes between groups of four as the code is typed', () => {
    expect(formatTypedCode('k7m2')).toBe('k7m2')
    expect(formatTypedCode('k7m2x')).toBe('k7m2-x')
    expect(formatTypedCode('K7M2-X9QP4tdv')).toBe('k7m2-x9qp-4tdv')
    expect(formatTypedCode('k7m2 x9qp 4tdv extra')).toBe('k7m2-x9qp-4tdv')
  })

  it('leaves a pasted link alone', () => {
    expect(formatTypedCode('https://whosehabits.com/r/k7m2')).toBe('https://whosehabits.com/r/k7m2')
  })
})
