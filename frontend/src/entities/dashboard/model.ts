export interface GradeBreakdown {
  grade_id: number
  name_ru: string
  name_tg: string
  min_purchase_amount: number
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
  grades: GradeBreakdown[]
}

export const dashboardKeys = {
  root: ['dashboard'] as const,
  summary: () => [...dashboardKeys.root, 'summary'] as const,
}
