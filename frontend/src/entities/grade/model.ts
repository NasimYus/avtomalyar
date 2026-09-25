import type { BadgeTone } from '@/shared/ui'

export interface Grade {
  id: number
  name_ru: string
  name_tg: string
  /** Lifetime purchase threshold, in dirams. */
  min_purchase_amount: number
}

export interface GradeInput {
  name_ru: string
  name_tg: string
  min_purchase_amount: number
}

export const gradeKeys = {
  root: ['grades'] as const,
  list: () => [...gradeKeys.root, 'list'] as const,
}

/**
 * Grades are defined by the shop, so their colour comes from where they
 * sit on the ladder rather than from their name: the entry grade is
 * bronze, the top grade is gold, everything between is silver.
 */
export function gradeToneByIndex(index: number, total: number): BadgeTone {
  if (total <= 1) return 'gold'
  if (index === 0) return 'bronze'
  if (index === total - 1) return 'gold'
  return 'silver'
}
