import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/shared/ui'

/**
 * Renders a feature the way the app does — inside a query client, a
 * router and the toast provider — so component tests exercise the real
 * component rather than a stripped-down copy of it.
 *
 * Queries do not retry here: a test that provokes a 401 should see it at
 * once instead of waiting out the app's retry policy.
 */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper }),
    user: userEvent.setup(),
    queryClient,
  }
}
