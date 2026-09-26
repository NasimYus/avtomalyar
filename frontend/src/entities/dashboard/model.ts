export interface GradeBreakdown {
  grade_id: number
  name_ru: string
  name_tg: string
  min_purchase_amount: number
  /** The material chosen by the admin; absent means "by place in the ladder". */
  color?: string
  dealers_count: number
}

export interface DashboardSummary {
  dealers_total: number
  dealers_active: number
  period_from: string
  period_to: string
  /** Purchases inside the period, in dirams. */
  period_amount: number
  period_count: number
  /** Sum of every dealer's lifetime total, in dirams. */
  lifetime_total: number
  /** Promotions running right now (ToR 5.1). */
  promotions_active: number
  /** Of those, the ones whose period is over and results are not computed. */
  promotions_awaiting: number
  grades: GradeBreakdown[]
}

export const dashboardKeys = {
  root: ['dashboard'] as const,
  summary: () => [...dashboardKeys.root, 'summary'] as const,
}
