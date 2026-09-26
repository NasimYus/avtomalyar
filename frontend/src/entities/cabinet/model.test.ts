import { describe, expect, it } from 'vitest'
import {
  cabinetStage,
  gradeProgress,
  isLevelUp,
  ladderIndex,
  ladderWindow,
  progressMood,
  seenGrade,
  splitPromotions,
  type CabinetPromotion,
  type DealerProfile,
} from './model'

function profile(overrides: Partial<DealerProfile>): DealerProfile {
  return {
    id: 1,
    full_name: 'ООО «Рангсоз»',
    phone: '+992 92 555 01 10',
    login: 'rangsoz',
    city_name_ru: 'Худжанд',
    city_name_tg: 'Хуҷанд',
    lifetime_purchase_total: 0,
    ladder: [],
    ...overrides,
  }
}

const silver = { id: 2, name_ru: 'Серебро', name_tg: 'Нуқра', min_purchase_amount: 100_000_000 }
const gold = { id: 3, name_ru: 'Золото', name_tg: 'Тилло', min_purchase_amount: 250_000_000 }

describe('gradeProgress', () => {
  it('measures progress from the current grade, not from zero', () => {
    // Half way between silver (100M) and gold (250M).
    const value = gradeProgress(
      profile({
        lifetime_purchase_total: 175_000_000,
        grade: silver,
        next_grade: { ...gold, remaining: 75_000_000 },
      }),
    )
    expect(value).toBeCloseTo(50)
  })

  it('is empty right after a grade is reached', () => {
    const value = gradeProgress(
      profile({
        lifetime_purchase_total: 100_000_000,
        grade: silver,
        next_grade: { ...gold, remaining: 150_000_000 },
      }),
    )
    expect(value).toBe(0)
  })

  it('is full once the top grade is reached', () => {
    expect(gradeProgress(profile({ lifetime_purchase_total: 400_000_000, grade: gold }))).toBe(100)
  })

  it('handles a dealer with no grade yet', () => {
    const value = gradeProgress(
      profile({
        lifetime_purchase_total: 50_000_000,
        next_grade: { ...silver, remaining: 50_000_000 },
      }),
    )
    expect(value).toBeCloseTo(50)
  })
})

describe('cabinetStage', () => {
  const today = '2026-09-25'

  it('is running while the period is open', () => {
    expect(cabinetStage('active', '2026-12-31', today)).toBe('running')
  })

  it('waits for results once the period has ended', () => {
    expect(cabinetStage('active', '2026-08-31', today)).toBe('awaiting')
  })

  it('still waits while the shop reviews computed results', () => {
    expect(cabinetStage('calculated', '2026-08-31', today)).toBe('awaiting')
  })

  it('is published once the results are announced', () => {
    expect(cabinetStage('published', '2026-08-31', today)).toBe('published')
  })

  it('is archived once the promotion is filed away', () => {
    expect(cabinetStage('archived', '2026-08-31', today)).toBe('archived')
  })

  it('counts the last day of the period as still running', () => {
    expect(cabinetStage('active', today, today)).toBe('running')
  })
})

describe('splitPromotions', () => {
  const today = '2026-09-25'

  function promotion(id: number, overrides: Partial<CabinetPromotion> = {}): CabinetPromotion {
    return {
      id,
      title_ru: `Акция ${String(id)}`,
      title_tg: `Аксия ${String(id)}`,
      start_date: '2026-09-01',
      end_date: '2026-12-31',
      status: 'active',
      participants_count: 0,
      eligible: true,
      requirements: [],
      ...overrides,
    }
  }

  it('keeps a running promotion the dealer is in as current', () => {
    const { current, ahead } = splitPromotions([promotion(1)], today)
    expect(current.map((p) => p.id)).toEqual([1])
    expect(ahead).toEqual([])
  })

  it('puts a promotion that has not started ahead, even when eligible', () => {
    const { current, ahead } = splitPromotions([promotion(2, { start_date: '2026-10-05' })], today)
    expect(current).toEqual([])
    expect(ahead.map((p) => p.id)).toEqual([2])
  })

  it('puts a running promotion with unmet conditions ahead', () => {
    const { current, ahead } = splitPromotions(
      [
        promotion(3, {
          eligible: false,
          requirements: [{ kind: 'purchases', met: false, threshold: 100, remaining: 40 }],
        }),
      ],
      today,
    )
    expect(current).toEqual([])
    expect(ahead.map((p) => p.id)).toEqual([3])
  })

  it('counts the first day of the period as started', () => {
    const { current } = splitPromotions([promotion(4, { start_date: today })], today)
    expect(current.map((p) => p.id)).toEqual([4])
  })

  it('files a published promotion under the archive, not among current ones', () => {
    const { current, archive } = splitPromotions(
      [promotion(5, { status: 'published', end_date: '2026-08-31' })],
      today,
    )
    expect(current).toEqual([])
    expect(archive.map((p) => p.id)).toEqual([5])
  })

  it('keeps an archived promotion in the archive as well', () => {
    const { archive } = splitPromotions(
      [promotion(6, { status: 'archived', end_date: '2025-12-31' })],
      today,
    )
    expect(archive.map((p) => p.id)).toEqual([6])
  })

  it('archives a finished promotion even when the dealer never qualified', () => {
    const { ahead, archive } = splitPromotions(
      [promotion(7, { status: 'published', eligible: false, end_date: '2026-08-31' })],
      today,
    )
    expect(ahead).toEqual([])
    expect(archive.map((p) => p.id)).toEqual([7])
  })
})

const bronze = { id: 1, name_ru: 'Бронза', name_tg: 'Биринҷӣ', min_purchase_amount: 0 }
const ladder = [bronze, silver, gold]

describe('ladderIndex', () => {
  it('finds the grade in the ladder', () => {
    expect(ladderIndex(profile({ ladder, grade: silver }))).toBe(1)
  })

  it('is -1 without a grade', () => {
    expect(ladderIndex(profile({ ladder }))).toBe(-1)
  })
})

describe('progressMood', () => {
  it('gets more excited the closer the next grade is', () => {
    expect([0, 19, 20, 50, 75, 89, 90, 100].map(progressMood)).toEqual([
      'start',
      'start',
      'steady',
      'half',
      'close',
      'close',
      'almost',
      'almost',
    ])
  })
})

describe('ladderWindow', () => {
  it('shows a short ladder whole', () => {
    expect(ladderWindow(5, 0)).toEqual([0, 1, 2, 3, 4])
  })

  it('folds a long one around the dealer, keeping the summit', () => {
    expect(ladderWindow(10, 4)).toEqual([3, 4, 5, 6, 9])
  })

  it('starts from the first step for a dealer without a grade', () => {
    expect(ladderWindow(10, -1)).toEqual([0, 1, 9])
  })

  it('does not step past either end', () => {
    expect(ladderWindow(10, 0)).toEqual([0, 1, 2, 9])
    expect(ladderWindow(10, 9)).toEqual([8, 9])
  })
})

describe('isLevelUp', () => {
  it('celebrates a climb since the last visit', () => {
    expect(isLevelUp(profile({ ladder, grade: gold }), String(silver.id))).toBe(true)
    expect(isLevelUp(profile({ ladder, grade: bronze }), 'none')).toBe(true)
  })

  it('stays quiet when nothing changed or on a first visit', () => {
    expect(isLevelUp(profile({ ladder, grade: gold }), String(gold.id))).toBe(false)
    expect(isLevelUp(profile({ ladder, grade: gold }), undefined)).toBe(false)
    expect(isLevelUp(profile({ ladder }), 'none')).toBe(false)
  })

  it('does not celebrate a step down or a grade that is gone', () => {
    expect(isLevelUp(profile({ ladder, grade: silver }), String(gold.id))).toBe(false)
    expect(isLevelUp(profile({ ladder, grade: gold }), '999')).toBe(false)
  })

  it('remembers the grade, or its absence', () => {
    expect(seenGrade(profile({ ladder, grade: gold }))).toBe('3')
    expect(seenGrade(profile({ ladder }))).toBe('none')
  })
})
