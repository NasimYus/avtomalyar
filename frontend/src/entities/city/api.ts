import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { cityKeys, type City, type CityInput } from './model'

export function useCities(): UseQueryResult<City[]> {
  return useQuery({
    queryKey: cityKeys.list(),
    queryFn: () => api.get<City[]>('/admin/cities/'),
  })
}

export function useCreateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CityInput) => api.post<City>('/admin/cities/', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cityKeys.root }),
  })
}

export function useUpdateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: CityInput & { id: number }) =>
      api.put<City>(`/admin/cities/${String(id)}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cityKeys.root }),
  })
}

export function useDeleteCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/cities/${String(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cityKeys.root }),
  })
}
