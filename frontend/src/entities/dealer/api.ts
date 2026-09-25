import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api, query, type Paginated } from '@/shared/api'
import {
  dealerKeys,
  type CreatedDealer,
  type Dealer,
  type DealerFilters,
  type DealerInput,
} from './model'

export function useDealers(filters: DealerFilters): UseQueryResult<Paginated<Dealer>> {
  return useQuery({
    queryKey: dealerKeys.list(filters),
    queryFn: () => api.get<Paginated<Dealer>>(`/admin/dealers/${query({ ...filters })}`),
    placeholderData: (previous) => previous,
  })
}

export function useDealer(id: number | undefined): UseQueryResult<Dealer> {
  return useQuery({
    queryKey: dealerKeys.detail(id ?? 0),
    queryFn: () => api.get<Dealer>(`/admin/dealers/${String(id)}`),
    enabled: id !== undefined,
  })
}

export function useCreateDealer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DealerInput) => api.post<CreatedDealer>('/admin/dealers/', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealerKeys.root }),
  })
}

export function useUpdateDealer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: DealerInput & { id: number }) =>
      api.put<Dealer>(`/admin/dealers/${String(id)}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealerKeys.root }),
  })
}

export function useSetDealerActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch<Dealer>(`/admin/dealers/${String(id)}/active`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealerKeys.root }),
  })
}

export function useResetDealerPassword() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ password: string }>(`/admin/dealers/${String(id)}/reset-password`),
  })
}
