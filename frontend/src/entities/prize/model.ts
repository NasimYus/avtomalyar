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

/**
 * The one shape every prize photo has. The admin frames each upload into
 * it (see manage-prize), and every card shows it in a box of the same
 * shape — so photos of any size and orientation line up the same way,
 * and nothing gets cut off that the admin did not choose to cut.
 */
export const PRIZE_PHOTO = {
  aspect: 4 / 3,
  /** Size of the file that is uploaded: sharp on a retina card, still small. */
  width: 1200,
  height: 900,
} as const
