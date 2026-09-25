import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'

/**
 * Retrying a 4xx never helps — the request is wrong, not flaky — and
 * retrying a 401 just delays the redirect to the login page.
 */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
