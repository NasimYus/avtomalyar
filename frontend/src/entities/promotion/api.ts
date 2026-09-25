import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api, query } from '@/shared/api'
import {
  promotionKeys,
  type PrizePlaceInput,
  type Promotion,
  type PromotionInput,
  type PromotionList,
  type PromotionResult,
  type PromotionStatus,
  type ResultAdjustment,
} from './model'

interface ResultsResponse {
  items: PromotionResult[]
}

export function usePromotions(status?: PromotionStatus): UseQueryResult<PromotionList> {
  return useQuery({
    queryKey: promotionKeys.list(status),
    queryFn: () => api.get<PromotionList>(`/admin/promotions/${query({ status })}`),
  })
}

export function usePromotion(id: number | undefined): UseQueryResult<Promotion> {
  return useQuery({
    queryKey: promotionKeys.detail(id ?? 0),
    queryFn: () => api.get<Promotion>(`/admin/promotions/${String(id)}`),
    enabled: id !== undefined,
  })
}

export function usePromotionResults(id: number | undefined): UseQueryResult<PromotionResult[]> {
  return useQuery({
    queryKey: promotionKeys.results(id ?? 0),
    queryFn: async () =>
      (await api.get<ResultsResponse>(`/admin/promotions/${String(id)}/results`)).items,
    enabled: id !== undefined,
  })
}

export function useCreatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PromotionInput) => api.post<Promotion>('/admin/promotions/', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: PromotionInput & { id: number }) =>
      api.put<Promotion>(`/admin/promotions/${String(id)}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

/** Replaces the whole "place → prize" table of a promotion. */
export function useSetPrizePlaces() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, places }: { id: number; places: PrizePlaceInput[] }) =>
      api.put<unknown>(`/admin/promotions/${String(id)}/prize-places`, { places }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

export function useDeletePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/promotions/${String(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

/** Lifecycle steps: start, publish and archive all return the promotion. */
function useLifecycleStep(step: 'start' | 'publish' | 'archive') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<Promotion>(`/admin/promotions/${String(id)}/${step}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

export function useStartPromotion() {
  return useLifecycleStep('start')
}

export function usePublishPromotion() {
  return useLifecycleStep('publish')
}

export function useArchivePromotion() {
  return useLifecycleStep('archive')
}

export function useCalculatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<ResultsResponse>(`/admin/promotions/${String(id)}/calculate`)).items,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}

export function useAdjustResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...adjustment }: ResultAdjustment & { id: number }) =>
      (await api.patch<ResultsResponse>(`/admin/promotions/${String(id)}/results`, adjustment))
        .items,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promotionKeys.root }),
  })
}
