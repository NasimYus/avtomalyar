export interface GradeRef {
  id: number
  name_ru: string
  name_tg: string
  /** Lifetime purchase total at which the grade is reached, in dirams. */
  min_purchase_amount: number
}

export interface NextGrade extends GradeRef {
  /** What is still missing to reach it, in dirams. */
  remaining: number
}

export interface DealerProfile {
  id: number
  full_name: string
  phone: string
  login: string
  city_name_ru: string
  city_name_tg: string
  lifetime_purchase_total: number
  grade?: GradeRef
  /** Absent once the top grade is reached. */
  next_grade?: NextGrade
}

export interface RankingEntry {
  dealer_id: number
  dealer_name: string
  place: number
  period_total: number
  prize_name_ru?: string
  prize_name_tg?: string
  awarded: boolean
  /** The row belonging to the dealer viewing the page. */
  is_me: boolean
}

/**
 * The statuses a dealer can ever see. Drafts and archived promotions are
 * not served to the cabinet at all.
 */
export type CabinetPromotionStatus = 'active' | 'calculated' | 'published'

export interface CabinetPrizePlace {
  place_rank: number
  prize_id: number
  prize_name_ru: string
  prize_name_tg: string
  prize_photo_path?: string
}

/**
 * A promotion as the cabinet receives it. It deliberately restates the
 * fields instead of reusing the admin's Promotion: this is the dealer's
 * own, narrower contract, and the two are free to drift apart.
 */
export interface CabinetPromotion {
  id: number
  title_ru: string
  title_tg: string
  description_ru?: string
  description_tg?: string
  start_date: string
  end_date: string
  status: CabinetPromotionStatus
  published_at?: string
  prize_places?: CabinetPrizePlace[]
  /** Absent while an ended promotion's results are being reviewed. */
  standing?: RankingEntry
  participants_count: number
}

export interface CabinetPurchase {
  id: number
  amount: number
  purchase_date: string
  comment?: string
}

export interface CabinetPurchasePage {
  items: CabinetPurchase[]
  total: number
  /** Sum over every purchase, not just this page, in dirams. */
  total_amount: number
  page: number
  per_page: number
}

export interface CabinetPromotionDetail extends CabinetPromotion {
  ranking: RankingEntry[]
  /** False while the ranking is a live count that can still change. */
  final: boolean
}

export const cabinetKeys = {
  root: ['cabinet'] as const,
  profile: () => [...cabinetKeys.root, 'profile'] as const,
  purchases: (page: number) => [...cabinetKeys.root, 'purchases', page] as const,
  promotions: () => [...cabinetKeys.root, 'promotions'] as const,
  promotion: (id: number) => [...cabinetKeys.root, 'promotion', id] as const,
}

/**
 * How far along the dealer is towards their next grade, as a percentage.
 * Progress is measured from the current grade's threshold, so reaching a
 * grade restarts the bar rather than leaving it nearly full.
 */
export function gradeProgress(profile: DealerProfile): number {
  const next = profile.next_grade
  if (!next) return 100

  const from = profile.grade?.min_purchase_amount ?? 0
  const span = next.min_purchase_amount - from
  if (span <= 0) return 100

  const done = profile.lifetime_purchase_total - from
  return Math.min(100, Math.max(0, (done / span) * 100))
}

/**
 * What the cabinet says about a promotion's stage. "Active" splits in two:
 * still running, or over and waiting for the shop to announce results.
 */
export type CabinetStage = 'running' | 'awaiting' | 'published'

export function cabinetStage(
  status: CabinetPromotionStatus,
  endDate: string,
  today: string,
): CabinetStage {
  if (status === 'published') return 'published'
  if (status === 'calculated') return 'awaiting'
  return endDate < today ? 'awaiting' : 'running'
}
