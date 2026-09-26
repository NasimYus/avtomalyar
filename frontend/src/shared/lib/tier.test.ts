import { describe, expect, it } from 'vitest'
import { TIER_COLORS, autoTierColors, tierAt, tierOf, tierRank } from './tier'

describe('autoTierColors', () => {
  it('keeps short ladders classic', () => {
    expect(autoTierColors(1)).toEqual(['gold'])
    expect(autoTierColors(2)).toEqual(['silver', 'gold'])
    expect(autoTierColors(3)).toEqual(['bronze', 'silver', 'gold'])
    expect(autoTierColors(4)).toEqual(['bronze', 'silver', 'gold', 'platinum'])
    expect(autoTierColors(5)).toEqual(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
  })

  it('slots gems between the metals and the diamond', () => {
    expect(autoTierColors(7)).toEqual([
      'bronze',
      'silver',
      'gold',
      'platinum',
      'emerald',
      'sapphire',
      'diamond',
    ])
  })

  it('uses every material once for a ladder of ten', () => {
    expect(autoTierColors(10)).toEqual([...TIER_COLORS])
  })

  it('gives every grade a colour however long the ladder', () => {
    for (let total = 0; total <= 20; total++) {
      const colors = autoTierColors(total)
      expect(colors).toHaveLength(total)
      if (total > 0) expect(colors[0]).not.toBe('onyx')
    }
    expect(autoTierColors(14).at(-1)).toBe('onyx')
  })

  it('never repeats a colour next to itself', () => {
    for (let total = 2; total <= 20; total++) {
      const colors = autoTierColors(total)
      colors.slice(1).forEach((color, i) => {
        expect(color).not.toBe(colors[i])
      })
    }
  })
})

describe('tierRank', () => {
  it('crowns the top grade only', () => {
    expect(tierRank(2, 3)).toBe('crown')
    expect(tierRank(0, 1)).toBe('crown')
    expect(tierRank(9, 10)).toBe('crown')
  })

  it('lets the upper half shine and keeps the entry grade plain', () => {
    expect(['base', 'base', 'crown']).toEqual([0, 1, 2].map((i) => tierRank(i, 3)))
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => tierRank(i, 10))).toEqual([
      'base',
      'base',
      'base',
      'base',
      'base',
      'shine',
      'shine',
      'shine',
      'shine',
      'crown',
    ])
    expect(tierRank(0, 2)).toBe('base')
  })
})

describe('tierAt', () => {
  it('follows the ladder when no colour is chosen', () => {
    expect(tierAt(1, 3)).toEqual({ color: 'silver', rank: 'base', level: 2, total: 3 })
  })

  it('lets a chosen colour win, but keeps the rank by place', () => {
    expect(tierAt(0, 3, 'ruby')).toEqual({ color: 'ruby', rank: 'base', level: 1, total: 3 })
  })

  it('ignores a colour it does not know', () => {
    expect(tierAt(2, 3, 'pink').color).toBe('gold')
    expect(tierAt(2, 3, null).color).toBe('gold')
  })
})

describe('tierOf', () => {
  const ladder = [{ id: 7 }, { id: 3, color: 'emerald' }, { id: 5 }]

  it('finds a grade by id', () => {
    expect(tierOf(ladder, 3)).toEqual({ color: 'emerald', rank: 'base', level: 2, total: 3 })
    expect(tierOf(ladder, 5)?.rank).toBe('crown')
  })

  it('is undefined without a grade', () => {
    expect(tierOf(ladder, undefined)).toBeUndefined()
    expect(tierOf(ladder, 42)).toBeUndefined()
  })
})
