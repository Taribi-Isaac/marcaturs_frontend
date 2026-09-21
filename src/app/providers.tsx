import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { createQueryClient } from '@/app/queryClient'
import { SeoRouteSync } from '@/shared/seo/SeoRouteSync'

export function AppProviders({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient?: QueryClient
}) {
  const [defaultClient] = useState(() => createQueryClient())
  const client = queryClient ?? defaultClient

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <SeoRouteSync />
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
