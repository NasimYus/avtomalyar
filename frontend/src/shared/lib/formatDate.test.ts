import { describe, expect, it } from 'vitest'
import { formatDate, formatDateShort, formatDateTime } from './formatDate'

describe('formatDate', () => {
  it('renders an API date as day.month.year', () => {
    expect(formatDate('2026-09-25')).toBe('25.09.2026')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('—')).toBe('—')
  })

  it('renders a short date without the year', () => {
    expect(formatDateShort('2026-09-25')).toBe('25.09')
  })
})

describe('formatDateTime', () => {
  it('renders a timestamp in the business timezone', () => {
    // 12:43 UTC is 17:43 in Dushanbe (UTC+5).
    expect(formatDateTime('2026-09-25T12:43:09Z')).toBe('25.09.2026, 17:43')
  })

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatDateTime('not a timestamp')).toBe('not a timestamp')
  })
})
