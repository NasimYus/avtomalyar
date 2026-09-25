import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSession, type Role } from '@/entities/session'
import { Spinner } from '@/shared/ui'

function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <Spinner className="size-8" />
    </div>
  )
}

/** Where each role belongs after signing in. */
function homeFor(role: Role): string {
  return role === 'admin' ? '/admin' : '/me'
}

/**
 * Gate for a section of the app. Anyone not signed in goes to /login;
 * anyone signed in with the wrong role is sent to their own home instead
 * of seeing a 403 they can't act on.
 */
export function RequireRole({ role }: { role: Role }) {
  const { data: principal, isPending } = useSession()

  if (isPending) return <FullPageSpinner />
  if (!principal) return <Navigate to="/login" replace />
  if (principal.role !== role) return <Navigate to={homeFor(principal.role)} replace />

  return <Outlet />
}

/** Sends an already-signed-in user away from the login screen. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { data: principal, isPending } = useSession()

  if (isPending) return <FullPageSpinner />
  if (principal) return <Navigate to={homeFor(principal.role)} replace />

  return <>{children}</>
}

/** "/" — resolves to the home of whoever is signed in. */
export function RoleHome() {
  const { data: principal, isPending } = useSession()

  if (isPending) return <FullPageSpinner />
  if (!principal) return <Navigate to="/login" replace />

  return <Navigate to={homeFor(principal.role)} replace />
}
