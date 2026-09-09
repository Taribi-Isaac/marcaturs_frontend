import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'
import { homePathForRole } from './authHelpers'
import type { UserRole } from '@/shared/types/auth'
import { LoadingState } from '@/shared/ui/States'
import type { ReactNode } from 'react'

export function RequireAuth({
  roles,
}: {
  roles?: Array<Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>>
}) {
  const { status, user, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingState label="Checking your session…" />
  }

  if (status === 'unauthenticated' || status === 'error') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'forbidden_role') {
    return <Navigate to="/forbidden" replace />
  }

  if (status === 'blocked') {
    return <Navigate to="/account-blocked" replace />
  }

  if (roles && user && !roles.includes(user.role as 'BUSINESS' | 'AMBASSADOR')) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return <Outlet />
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()

  if ((status === 'authenticated' || status === 'restricted') && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return children
}
