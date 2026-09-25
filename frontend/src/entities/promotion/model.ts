import type { BadgeTone } from '@/shared/ui'

/** The lifecycle stages a promotion moves through (ToR 3.4). */
export const PROMOTION_STATUSES = [
  'draft',
  'active',
  'calculated',
  'published',
  'archived',
] as const

export type PromotionStatus = (typeof PROMOTION_STATUSES)[number]

export interface PrizePlace {
  place_rank: number
  prize_id: number
  prize_name_ru: string
  prize_name_tg: string
  prize_photo_path?: string
}

export interface Promotion {
  id: number
  title_ru: string
  title_tg: string
  description_ru?: string
  description_tg?: string
  start_date: string
  end_date: string
  city_id?: number
  grade_id?: number
  /** Lifetime purchase threshold, in dirams. */
  min_lifetime_purchase_threshold?: number
  status: PromotionStatus
  calculated_at?: string
  published_at?: string
  /** Only returned when a single promotion is fetched. */
  prize_places?: PrizePlace[]
}

export interface PromotionInput {
  title_ru: string
  title_tg: string
  description_ru: string | null
  description_tg: string | null
  start_date: string
  end_date: string
  city_id: number | null
  grade_id: number | null
  min_lifetime_purchase_threshold: number | null
}

export interface PrizePlaceInput {
  place_rank: number
  prize_id: number
}

export interface PromotionResult {
  dealer_id: number
  dealer_name: string
  /** Sum of purchases inside the promotion period, in dirams. */
  period_total: number
  place_rank?: number
  prize_id?: number
  prize_name_ru?: string
  prize_name_tg?: string
  is_manually_adjusted: boolean
  awarded: boolean
}

export interface ResultAdjustment {
  dealer_id: number
  place_rank: number | null
  prize_id: number | null
  awarded: boolean
}

export interface PromotionList {
  items: Promotion[]
  /** Per-status totals for the tabs; every status is present. */
  counts: Record<PromotionStatus, number>
}

export const promotionKeys = {
  root: ['promotions'] as const,
  list: (status?: PromotionStatus) => [...promotionKeys.root, 'list', status ?? 'all'] as const,
  detail: (id: number) => [...promotionKeys.root, 'detail', id] as const,
  results: (id: number) => [...promotionKeys.root, 'results', id] as const,
}

const STATUS_TONES: Record<PromotionStatus, BadgeTone> = {
  draft: 'neutral',
  active: 'success',
  calculated: 'warning',
  published: 'dark',
  archived: 'neutral',
}

export function statusTone(status: PromotionStatus): BadgeTone {
  return STATUS_TONES[status]
}

/** A promotion's terms may only change before its results are computed. */
export function isEditable(status: PromotionStatus): boolean {
  return status === 'draft' || status === 'active'
}

/**
 * Whether the period is over, which is what "active" splits into on the
 * screen: still running, or waiting for the admin to compute results.
 */
export function isPeriodOver(promotion: Promotion, today: string): boolean {
  return promotion.end_date < today
}
