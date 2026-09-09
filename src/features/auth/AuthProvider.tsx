import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser, loginRequest, logoutRequest, registerRequest } from '@/features/auth/api'
import {
  AUTH_ME_QUERY_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from '@/features/auth/authContext'
import { ApiClientError } from '@/shared/api/errors'
import { onUnauthorized } from '@/shared/api/sessionEvents'
import type { AuthUser } from '@/shared/types/auth'

function classifyUser(user: AuthUser): AuthStatus {
  if (user.role === 'ADMIN') return 'forbidden_role'
  if (user.status === 'suspended' || user.status === 'banned') return 'blocked'
  if (user.status === 'restricted') return 'restricted'
  if (user.role === 'BUSINESS' || user.role === 'AMBASSADOR') return 'authenticated'
  return 'forbidden_role'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    retry: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    return onUnauthorized(() => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
      void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    })
  }, [queryClient])

  const user = meQuery.data ?? null

  const status: AuthStatus = useMemo(() => {
    if (meQuery.isPending && !meQuery.isFetched) return 'unknown'
    if (meQuery.isError) {
      if (meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
        return 'unauthenticated'
      }
      return 'error'
    }
    if (!user) return 'unauthenticated'
    return classifyUser(user)
  }, [meQuery.error, meQuery.isError, meQuery.isFetched, meQuery.isPending, user])

  const refresh = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: AUTH_ME_QUERY_KEY,
      queryFn: ({ signal }) => fetchCurrentUser(signal),
    })
  }, [queryClient])

  const login = useCallback(
    async (payload: Parameters<AuthContextValue['login']>[0]) => {
      await loginRequest(payload)
      const next = await queryClient.fetchQuery({
        queryKey: AUTH_ME_QUERY_KEY,
        queryFn: ({ signal }) => fetchCurrentUser(signal),
      })
      if (next.role === 'ADMIN') {
        try {
          await logoutRequest()
        } catch {
          // ignore
        }
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
        throw new ApiClientError({
          code: 'forbidden',
          message: 'Admin accounts use the Admin Control application.',
          status: 403,
        })
      }
      return next
    },
    [queryClient],
  )

  const register = useCallback(
    async (payload: Parameters<AuthContextValue['register']>[0]) => {
      await registerRequest(payload)
      return queryClient.fetchQuery({
        queryKey: AUTH_ME_QUERY_KEY,
        queryFn: ({ signal }) => fetchCurrentUser(signal),
      })
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isBootstrapping: status === 'unknown',
      login,
      register,
      logout,
      refresh,
    }),
    [status, user, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
