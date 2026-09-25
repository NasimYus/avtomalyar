import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api, query } from '@/shared/api'
import {
  purchaseKeys,
  type Purchase,
  type PurchaseFilters,
  type PurchaseInput,
  type PurchasePage,
} from './model'

export function usePurchases(filters: PurchaseFilters): UseQueryResult<PurchasePage> {
  return useQuery({
    queryKey: purchaseKeys.list(filters),
    queryFn: () => api.get<PurchasePage>(`/admin/purchases/${query({ ...filters })}`),
    placeholderData: (previous) => previous,
  })
}

/** Purchases change lifetime totals and grades, so everything is refetched. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useCreatePurchase() {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: (input: PurchaseInput) => api.post<Purchase>('/admin/purchases/', input),
    onSuccess: invalidateAll,
  })
}

export function useUpdatePurchase() {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, ...input }: PurchaseInput & { id: number }) =>
      api.put<Purchase>(`/admin/purchases/${String(id)}`, input),
    onSuccess: invalidateAll,
  })
}

export function useDeletePurchase() {
  const invalidateAll = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/purchases/${String(id)}`),
    onSuccess: invalidateAll,
  })
}
