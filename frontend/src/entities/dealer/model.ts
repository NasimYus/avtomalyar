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

export const dealerKeys = {
  root: ['dealers'] as const,
  list: (filters: DealerFilters) => [...dealerKeys.root, 'list', filters] as const,
  detail: (id: number) => [...dealerKeys.root, 'detail', id] as const,
}
