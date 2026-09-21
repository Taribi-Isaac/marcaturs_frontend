import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

const verifiedAmbassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR' as const,
  status: 'active' as const,
  email_verified_at: '2026-01-01T00:00:00+00:00',
  last_login_at: '2026-01-02T00:00:00+00:00',
  created_at: '2026-01-01T00:00:00+00:00',
}

const unverifiedAmbassador = {
  ...verifiedAmbassador,
  email_verified_at: null,
}

let me: typeof verifiedAmbassador | typeof unverifiedAmbassador | null = null
let meStatus = 200

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (meStatus === 401) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (meStatus === 503) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Temporary failure.' } },
        { status: 503 },
      )
    }
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: me })
  }),
  http.post('/api/v1/auth/logout', () => {
    me = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/deals', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/commissions', () =>
    HttpResponse.json({ success: true, data: [], meta: { pagination: { current_page: 1, last_page: 1 } } }),
  ),
  http.get('/api/v1/conversations', () =>
    HttpResponse.json({ success: true, data: [], meta: { pagination: { current_page: 1, last_page: 1 } } }),
  ),
  http.get('/api/v1/verification/status', () =>
    HttpResponse.json({
      success: true,
      data: { overall_status: 'NOT_STARTED', requirements: [] },
    }),
  ),
  http.get('/api/v1/ambassadors/me', () =>
    HttpResponse.json({
      success: true,
      data: { certification: { is_certified: false, awards: [] } },
    }),
  ),
  http.get('/api/v1/certification/enrollments', () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
)

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  return render(
    <AppProviders queryClient={queryClient}>
      <AppRouter />
    </AppProviders>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = null
  meStatus = 200
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('MH-GATE-006 RequireAuth gate', () => {
  it('redirects 401 me failures to login', async () => {
    meStatus = 401
    renderApp('/app/ambassador')
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows email verification gate when email_verified_at is null', async () => {
    me = unverifiedAmbassador
    renderApp('/app/ambassador')
    expect(await screen.findByRole('heading', { name: /verify your email to continue/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument()
  })

  it('allows verified ambassadors into home', async () => {
    me = verifiedAmbassador
    renderApp('/app/ambassador')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })

  it('shows session recovery for non-401 me failures', async () => {
    meStatus = 503
    renderApp('/app/ambassador')
    expect(
      await screen.findByRole('heading', { name: /could not confirm your session/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument()
  })
})
