import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { dashboardKeys, type DashboardSummary } from './model'

/** Summary for the current month (the API picks the period by default). */
export function useDashboardSummary(): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => api.get<DashboardSummary>('/admin/dashboard/summary'),
  })
}
