import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import i18n from '@/shared/i18n'
import { formatMoney, parseMoneyInput, useMoneyWithUnit } from './formatMoney'

const NBSP = '\u00A0'

// Intl.NumberFormat uses NBSP as a grouping separator for ru-RU; normalize
// to a regular space so assertions stay readable.
function normalizeSpaces(value: string): string {
  return value.split(NBSP).join(' ')
}

describe('formatMoney', () => {
  it('formats whole somoni without trailing zeros', () => {
    expect(normalizeSpaces(formatMoney(14200000))).toBe('142 000')
  })

  it('keeps dirams when the amount is not whole', () => {
    expect(normalizeSpaces(formatMoney(14200050))).toBe('142 000,50')
  })

  it('pads a single-digit diram remainder', () => {
    expect(formatMoney(105)).toBe('1,05')
  })

  it('handles zero', () => {
    expect(formatMoney(0)).toBe('0')
  })
})

describe('useMoneyWithUnit', () => {
  it('appends the Russian unit by default', async () => {
    await i18n.changeLanguage('ru')
    const { result } = renderHook(() => useMoneyWithUnit())

    expect(normalizeSpaces(result.current(14200000))).toBe('142 000 сом.')
  })

  it('appends the Tajik unit when the interface is Tajik', async () => {
    await i18n.changeLanguage('tg')
    const { result } = renderHook(() => useMoneyWithUnit())

    expect(normalizeSpaces(result.current(14200000))).toBe('142 000 сомонӣ')
    await i18n.changeLanguage('ru')
  })
})

describe('parseMoneyInput', () => {
  it.each([
    ['120000', 12000000],
    ['120 000', 12000000],
    [`120${NBSP}000`, 12000000],
    ['120000,50', 12000050],
    ['120000.5', 12000050],
    ['0', 0],
  ])('parses %j as %i dirams', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected)
  })

  it.each(['', 'abc', '12,345', '-5', '1 000,123'])('rejects %j', (input) => {
    expect(parseMoneyInput(input)).toBeNull()
  })
})
