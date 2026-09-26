export interface GradeRef {
  id: number
  name_ru: string
  name_tg: string
  /** Lifetime purchase total at which the grade is reached, in dirams. */
  min_purchase_amount: number
  /** The material chosen by the admin; absent means "by place in the ladder". */
  color?: string
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
  /** Every grade, in ascending order of threshold. */
  ladder: GradeRef[]
}

export interface RankingEntry {
  dealer_id: number
  dealer_name: string
  /** The dealer's city — part of the public ranking line (ToR 4.7). */
  city_name_ru: string
  city_name_tg: string
  place: number
  period_total: number
  prize_name_ru?: string
  prize_name_tg?: string
  awarded: boolean
  /** The row belonging to the dealer viewing the page. */
  is_me: boolean
}

/**
 * The statuses a dealer can ever see. Drafts never reach the cabinet, and
 * an archived promotion only does when its results were published before
 * it was filed away.
 */
export type CabinetPromotionStatus = 'active' | 'calculated' | 'published' | 'archived'

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
  /** False when the dealer does not meet the conditions yet. */
  eligible: boolean
  requirements: CabinetRequirement[]
}

/** One of a promotion's entry conditions, as it stands for this dealer. */
export interface CabinetRequirement {
  kind: 'city' | 'grade' | 'purchases'
  met: boolean
  /** City or grade name; absent for a purchase threshold. */
  name_ru?: string
  name_tg?: string
  /** Purchase threshold and what is still missing, in dirams. */
  threshold?: number
  remaining?: number
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

/** Where the dealer's grade sits in the ladder; -1 without a grade. */
export function ladderIndex(profile: DealerProfile): number {
  const grade = profile.grade
  if (grade === undefined) return -1
  return profile.ladder.findIndex((step) => step.id === grade.id)
}

/**
 * The cheer above the progress bar. Bands rather than a sentence per
 * percent: the message changes a handful of times on the way, each time
 * a little more urgent, which is what makes the last stretch feel close.
 */
export type ProgressMood = 'start' | 'steady' | 'half' | 'close' | 'almost'

export function progressMood(percent: number): ProgressMood {
  if (percent >= 90) return 'almost'
  if (percent >= 75) return 'close'
  if (percent >= 50) return 'half'
  if (percent >= 20) return 'steady'
  return 'start'
}

/** Ladders up to this long are always shown whole. */
const LADDER_FOLD_FROM = 6

/**
 * The ladder steps shown while a long ladder is folded: the one behind
 * the dealer, their own, the next two — and always the summit, so the
 * big goal stays in sight. Returned ascending; a jump between two
 * indices is where the list folds.
 */
export function ladderWindow(total: number, current: number): number[] {
  const all = Array.from({ length: total }, (_, i) => i)
  if (total < LADDER_FOLD_FROM) return all

  const shown = new Set([current - 1, current, current + 1, current + 2, total - 1])
  // Without a grade yet, the first step is the one to reach.
  if (current === -1) shown.add(0)
  return all.filter((i) => shown.has(i))
}

/**
 * Whether the dealer has climbed since they last opened the cabinet.
 *
 * `seen` is what was remembered then: a grade id, or 'none' for a dealer
 * without one. Grades are compared by their place in today's ladder, not
 * by threshold, so an admin editing thresholds does not throw a party.
 * Nothing remembered (a first visit, another device) is not a level-up.
 */
export function isLevelUp(profile: DealerProfile, seen: string | undefined): boolean {
  const current = ladderIndex(profile)
  if (seen === undefined || current === -1) return false
  if (seen === 'none') return true

  const before = profile.ladder.findIndex((step) => String(step.id) === seen)
  return before !== -1 && current > before
}

/** What isLevelUp compares against next time. */
export function seenGrade(profile: DealerProfile): string {
  return profile.grade === undefined ? 'none' : String(profile.grade.id)
}

/** A promotion whose period has not started yet. */
export function isUpcoming(promotion: CabinetPromotion, today: string): boolean {
  return promotion.start_date > today
}

/** A promotion whose results have been announced (ToR 6 — the archive). */
export function isFinished(promotion: CabinetPromotion): boolean {
  return promotion.status === 'published' || promotion.status === 'archived'
}

/**
 * Splits the dealer's promotions into the three groups the cabinet shows:
 * what they are competing in now, what is still ahead of them (not started
 * or conditions unmet), and the archive of finished ones with results.
 */
export function splitPromotions(
  promotions: CabinetPromotion[],
  today: string,
): { current: CabinetPromotion[]; ahead: CabinetPromotion[]; archive: CabinetPromotion[] } {
  const current: CabinetPromotion[] = []
  const ahead: CabinetPromotion[] = []
  const archive: CabinetPromotion[] = []

  for (const promotion of promotions) {
    if (isFinished(promotion)) archive.push(promotion)
    else if (promotion.eligible && !isUpcoming(promotion, today)) current.push(promotion)
    else ahead.push(promotion)
  }
  return { current, ahead, archive }
}

/**
 * What the cabinet says about a promotion's stage. "Active" splits in two:
 * still running, or over and waiting for the shop to announce results.
 */
export type CabinetStage = 'running' | 'awaiting' | 'published' | 'archived'

export function cabinetStage(
  status: CabinetPromotionStatus,
  endDate: string,
  today: string,
): CabinetStage {
  if (status === 'archived') return 'archived'
  if (status === 'published') return 'published'
  if (status === 'calculated') return 'awaiting'
  return endDate < today ? 'awaiting' : 'running'
}
