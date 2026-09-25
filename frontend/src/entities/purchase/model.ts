export interface Purchase {
  id: number
  dealer_id: number
  /** Amount in dirams. */
  amount: number
  /** ISO date, e.g. "2026-09-24". */
  purchase_date: string
  comment?: string
  created_by: number
}

export interface PurchaseInput {
  dealer_id: number
  amount: number
  purchase_date: string
  comment: string | null
}

export interface PurchaseFilters {
  dealer_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

/** List envelope: page of purchases plus totals over the whole filter. */
export interface PurchasePage {
  items: Purchase[]
  total: number
  total_amount: number
  page: number
  per_page: number
}

export const purchaseKeys = {
  root: ['purchases'] as const,
  list: (filters: PurchaseFilters) => [...purchaseKeys.root, 'list', filters] as const,
}
