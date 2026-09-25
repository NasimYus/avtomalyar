import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api, query } from '@/shared/api'
import {
  cabinetKeys,
  type CabinetPromotion,
  type CabinetPromotionDetail,
  type CabinetPurchasePage,
  type DealerProfile,
} from './model'

interface PromotionsResponse {
  items: CabinetPromotion[]
}

export function useDealerProfile(): UseQueryResult<DealerProfile> {
  return useQuery({
    queryKey: cabinetKeys.profile(),
    queryFn: () => api.get<DealerProfile>('/me/profile'),
  })
}

export function useMyPurchases(page: number, perPage: number): UseQueryResult<CabinetPurchasePage> {
  return useQuery({
    queryKey: cabinetKeys.purchases(page),
    queryFn: () =>
      api.get<CabinetPurchasePage>(`/me/purchases${query({ page, per_page: perPage })}`),
  })
}

export function useMyPromotions(): UseQueryResult<CabinetPromotion[]> {
  return useQuery({
    queryKey: cabinetKeys.promotions(),
    queryFn: async () => (await api.get<PromotionsResponse>('/me/promotions')).items,
  })
}

export function useMyPromotion(id: number): UseQueryResult<CabinetPromotionDetail> {
  return useQuery({
    queryKey: cabinetKeys.promotion(id),
    queryFn: () => api.get<CabinetPromotionDetail>(`/me/promotions/${String(id)}`),
  })
}
