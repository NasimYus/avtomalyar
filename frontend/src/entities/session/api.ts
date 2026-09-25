import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { sessionKeys, type LoginCredentials, type Principal } from './model'

/**
 * Current session. A 401 is a valid answer ("nobody is logged in"), so it
 * resolves to null instead of throwing — route guards read it directly.
 */
export function useSession(): UseQueryResult<Principal | null> {
  return useQuery({
    queryKey: sessionKeys.me(),
    queryFn: async () => {
      try {
        return await api.get<Principal>('/auth/me')
      } catch {
        return null
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => api.post<Principal>('/auth/login', credentials),
    onSuccess: (principal) => {
      queryClient.setQueryData(sessionKeys.me(), principal)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post<undefined>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.me(), null)
      // Everything cached belonged to the session that just ended.
      queryClient.clear()
    },
  })
}
