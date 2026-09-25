export interface City {
  id: number
  name_ru: string
  name_tg: string
}

export interface CityInput {
  name_ru: string
  name_tg: string
}

export const cityKeys = {
  root: ['cities'] as const,
  list: () => [...cityKeys.root, 'list'] as const,
}
