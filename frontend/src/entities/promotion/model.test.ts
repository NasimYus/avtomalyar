import { describe, expect, it } from 'vitest'
import { isEditable, isPeriodOver, statusTone, type Promotion } from './model'

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 1,
    title_ru: 'Летняя гонка',
    title_tg: 'Пойгаи тобистона',
    start_date: '2026-06-01',
    end_date: '2026-08-31',
    status: 'active',
    ...overrides,
  }
}

describe('isEditable', () => {
  it('allows changes while a promotion is a draft or running', () => {
    expect(isEditable('draft')).toBe(true)
    expect(isEditable('active')).toBe(true)
  })

  it('freezes the terms once results exist', () => {
    // Changing the period after a ranking was computed would invalidate it.
    expect(isEditable('calculated')).toBe(false)
    expect(isEditable('published')).toBe(false)
    expect(isEditable('archived')).toBe(false)
  })
})

describe('isPeriodOver', () => {
  const today = '2026-09-25'

  it('is false while the period is still running', () => {
    expect(isPeriodOver(promotion({ end_date: '2026-12-31' }), today)).toBe(false)
  })

  it('counts the last day of the period as still running', () => {
    expect(isPeriodOver(promotion({ end_date: today }), today)).toBe(false)
  })

  it('is true the day after the period ends', () => {
    expect(isPeriodOver(promotion({ end_date: '2026-09-24' }), today)).toBe(true)
  })
})

describe('statusTone', () => {
  it('gives every status a tone', () => {
    const statuses = ['draft', 'active', 'calculated', 'published', 'archived'] as const
    for (const status of statuses) {
      expect(statusTone(status)).toBeTruthy()
    }
  })

  it('marks a running promotion as success and a published one as dark', () => {
    expect(statusTone('active')).toBe('success')
    expect(statusTone('published')).toBe('dark')
  })
})
