export interface Dealer {
  id: number
  full_name: string
  phone: string
  city_id: number
  grade_id?: number
  /** Sum of all purchases ever, in dirams — drives the grade. */
  lifetime_purchase_total: number
  login: string
  is_active: boolean
}

/** A dealer plus the password generated for them — shown once. */
export interface CreatedDealer extends Dealer {
  password: string
}

export interface DealerInput {
  full_name: string
  phone: string
  city_id: number
}

export interface DealerFilters {
  q?: string
  city_id?: number
  grade_id?: number
  is_active?: boolean
  page?: number
  per_page?: number
}

/**
 * A promotion a dealer takes part in, as the admin's dealer card shows it
 * (ToR 5.3). The shape comes from the same endpoint family the cabinet
 * uses, so the admin sees exactly what the dealer sees.
 */
export interface DealerPromotion {
  id: number
  title_ru: string
  title_tg: string
  start_date: string
  end_date: string
  status: 'active' | 'calculated' | 'published' | 'archived'
  eligible: boolean
  participants_count: number
  standing?: {
    place: number
    period_total: number
    prize_name_ru?: string
    prize_name_tg?: string
    awarded: boolean
  }
}

export const dealerKeys = {
  root: ['dealers'] as const,
  list: (filters: DealerFilters) => [...dealerKeys.root, 'list', filters] as const,
  detail: (id: number) => [...dealerKeys.root, 'detail', id] as const,
  promotions: (id: number) => [...dealerKeys.root, 'promotions', id] as const,
}
