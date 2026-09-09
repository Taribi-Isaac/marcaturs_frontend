import { createContext, useContext } from 'react'
import type { AuthUser, LoginPayload, RegisterPayload } from '@/shared/types/auth'

export type AuthStatus =
  | 'unknown'
  | 'unauthenticated'
  | 'authenticated'
  | 'forbidden_role'
  | 'restricted'
  | 'blocked'
  | 'error'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  isBootstrapping: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
