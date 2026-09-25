/** Envelope the API uses for every paginated list. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}
