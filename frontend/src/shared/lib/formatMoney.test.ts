import { describe, expect, it } from 'vitest'
import { formatMoney } from './formatMoney'

const NBSP = ' '

// Intl.NumberFormat uses NBSP as a grouping separator for ru-RU; normalize
// to a regular space so the assertion is readable and stable.
function normalizeSpaces(value: string): string {
  return value.split(NBSP).join(' ')
}

describe('formatMoney', () => {
  it('converts dirams to a somoni string with two decimals', () => {
    expect(normalizeSpaces(formatMoney(123456))).toBe('1 234,56 сомони')
  })

  it('handles zero', () => {
    expect(formatMoney(0)).toBe('0,00 сомони')
  })
})
