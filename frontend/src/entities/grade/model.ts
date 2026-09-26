import type { TierColor } from '@/shared/lib'

export interface Grade {
  id: number
  name_ru: string
  name_tg: string
  /** Lifetime purchase threshold, in dirams. */
  min_purchase_amount: number
  /** The material chosen by the admin; absent means "by place in the ladder". */
  color?: string
}

export interface GradeInput {
  name_ru: string
  name_tg: string
  min_purchase_amount: number
  /** Null leaves the colour to the grade's place in the ladder. */
  color: TierColor | null
}

export const gradeKeys = {
  root: ['grades'] as const,
  list: () => [...gradeKeys.root, 'list'] as const,
}
