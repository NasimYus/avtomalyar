import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { gradeKeys, type Grade, type GradeInput } from './model'

export function useGrades(): UseQueryResult<Grade[]> {
  return useQuery({
    queryKey: gradeKeys.list(),
    queryFn: () => api.get<Grade[]>('/admin/grades/'),
  })
}

export function useCreateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GradeInput) => api.post<Grade>('/admin/grades/', input),
    // A grade change recomputes every dealer's grade server-side.
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useUpdateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: GradeInput & { id: number }) =>
      api.put<Grade>(`/admin/grades/${String(id)}`, input),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useDeleteGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<undefined>(`/admin/grades/${String(id)}`),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
