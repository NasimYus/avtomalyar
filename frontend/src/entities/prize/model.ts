export interface Prize {
  id: number
  name_ru: string
  name_tg: string
  description_ru?: string
  description_tg?: string
  /** Path served under /media/, absent until a photo is uploaded. */
  photo_url?: string
  stock_quantity?: number
}

export interface PrizeInput {
  name_ru: string
  name_tg: string
  description_ru: string | null
  description_tg: string | null
  stock_quantity: number | null
}

export const prizeKeys = {
  root: ['prizes'] as const,
  list: () => [...prizeKeys.root, 'list'] as const,
}
