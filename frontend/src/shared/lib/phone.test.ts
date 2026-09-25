import { describe, expect, it } from 'vitest'
import { formatPhone, isPhoneComplete } from './phone'

describe('formatPhone', () => {
  it.each([
    ['', ''],
    ['9', '+992 9'],
    ['92', '+992 92'],
    ['925', '+992 92 5'],
    ['925550110', '+992 92 555 01 10'],
    // The country code may already be there, typed or stored.
    ['992925550110', '+992 92 555 01 10'],
    ['+992 92 555 01 10', '+992 92 555 01 10'],
    // Anything that isn't a digit is ignored, including a pasted number.
    ['+992 (92) 555-01-10', '+992 92 555 01 10'],
    ['abc', ''],
  ])('formats %j as %j', (input, expected) => {
    expect(formatPhone(input)).toBe(expected)
  })

  it('drops digits past a full national number', () => {
    expect(formatPhone('9255501109999')).toBe('+992 92 555 01 10')
  })

  it('is stable when applied to its own output', () => {
    const once = formatPhone('925550110')
    expect(formatPhone(once)).toBe(once)
  })
})

describe('isPhoneComplete', () => {
  it.each([
    ['+992 92 555 01 10', true],
    ['925550110', true],
    ['+992 92 555 01', false],
    ['', false],
  ])('reports %j as %s', (input, expected) => {
    expect(isPhoneComplete(input)).toBe(expected)
  })
})
