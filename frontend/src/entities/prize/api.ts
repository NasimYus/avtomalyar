import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { prizeKeys, type Prize, type PrizeInput } from './model'

export function usePrizes(): UseQueryResult<Prize[]> {
  return useQuery({
    queryKey: prizeKeys.list(),
    queryFn: () => api.get<Prize[]>('/admin/prizes/'),
  })
}

export function useCreatePrize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PrizeInput) => api.post<Prize>('/admin/prizes/', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prizeKeys.root }),
  })
}

export function useUpdatePrize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: PrizeInput & { id: number }) =>
      api.put<Prize>(`/admin/prizes/${String(id)}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prizeKeys.root }),
  })
}

export function useUploadPrizePhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      api.upload<Prize>(`/admin/prizes/${String(id)}/photo`, 'photo', file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prizeKeys.root }),
  })
}

export function useDeletePrize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/prizes/${String(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: prizeKeys.root }),
  })
}
