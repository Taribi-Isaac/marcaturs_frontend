import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { AuthUser } from '@/shared/types/auth'

const businessUser: AuthUser = {
  id: 1,
  name: 'Biz User',
  email: 'biz@example.com',
  role: 'BUSINESS',
  status: 'active',
  email_verified_at: '2026-01-01T00:00:00+00:00',
  last_login_at: null,
  created_at: null,
}

const ambassadorUser: AuthUser = {
  ...businessUser,
  id: 2,
  name: 'Amb User',
  email: 'amb@example.com',
  role: 'AMBASSADOR',
}

const adminUser: AuthUser = {
  ...businessUser,
  id: 3,
  name: 'Ops Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  staff_role: 'SUPER_ADMIN',
}

const accounts: Record<string, AuthUser> = {
  [businessUser.email]: businessUser,
  [ambassadorUser.email]: ambassadorUser,
  [adminUser.email]: adminUser,
}

let currentUser: AuthUser | null = null

const unauthenticated = () =>
  HttpResponse.json(
    { success: false, error: { code: 'unauthenticated', message: 'Authentication is required.' } },
    { status: 401 },
  )

const emptyPage = (perPage: number) =>
  HttpResponse.json({
    success: true,
    data: [],
    meta: { pagination: { current_page: 1, last_page: 1, per_page: perPage, total: 0 } },
  })

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () =>
    currentUser ? HttpResponse.json({ success: true, data: currentUser }) : unauthenticated(),
  ),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    const account = accounts[body.email]
    if (!account) return unauthenticated()
    currentUser = account
    return HttpResponse.json({ success: true, data: { user: account } })
  }),
  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      role: 'BUSINESS' | 'AMBASSADOR'
      name: string
      email: string
    }
    const base = body.role === 'BUSINESS' ? businessUser : ambassadorUser
    currentUser = { ...base, name: body.name, email: body.email, email_verified_at: null }
    return HttpResponse.json({ success: true, data: { user: currentUser } }, { status: 201 })
  }),
  http.post('/api/v1/auth/logout', () => {
    if (!currentUser) return unauthenticated()
    currentUser = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/categories', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/marketplace/campaigns', () => emptyPage(12)),
  http.get('/api/v1/campaigns', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/deals', () => emptyPage(50)),
  http.get('/api/v1/commissions', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/disputes', () => emptyPage(15)),
  http.get('/api/v1/notifications', () => emptyPage(20)),
  http.get('/api/v1/conversations', () => emptyPage(20)),
  http.get('/api/v1/verification/status', () =>
    HttpResponse.json({ success: true, data: { overall_status: 'VERIFIED', requirements: [] } }),
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

type RecordedCall = {
  url: string
  method: string
  headers: Record<string, string>
  credentials: RequestCredentials | undefined
}

function recordFetches(): RecordedCall[] {
  const calls: RecordedCall[] = []
  const passthrough = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) },
      credentials: init?.credentials,
    })
    return passthrough(input, init)
  })
  return calls
}

function isCall(call: RecordedCall, method: string, path: string): boolean {
  return call.method === method && new URL(call.url, window.location.origin).pathname === path
}

function hasAuthorizationHeader(call: RecordedCall): boolean {
  return Object.keys(call.headers).some((name) => name.toLowerCase() === 'authorization')
}

/** Storage keys written by the app, excluding MSW's own mocked-cookie store. */
function appStorageKeys(): string[] {
  return [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(
    (key) => !key.startsWith('__msw'),
  )
}

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

async function signIn(email: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^email$/i), email)
  await user.type(screen.getByLabelText(/^password$/i), 'DemoPass123!')
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))
}

beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  currentUser = null
  server.resetHandlers()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())

describe('participant session authentication contract', () => {
  it('signs a Business in through the CSRF-protected cookie session without a bearer token', async () => {
    server.use(
      http.get(
        '/sanctum/csrf-cookie',
        () =>
          new HttpResponse(null, {
            status: 204,
            headers: { 'Set-Cookie': 'XSRF-TOKEN=participant-xsrf%3D; Path=/' },
          }),
      ),
    )
    const calls = recordFetches()
    renderApp('/login')

    await signIn(businessUser.email)

    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/business navigation/i)).toBeInTheDocument()

    const csrfIndex = calls.findIndex((call) => isCall(call, 'GET', '/sanctum/csrf-cookie'))
    const loginIndex = calls.findIndex((call) => isCall(call, 'POST', '/api/v1/auth/login'))
    expect(csrfIndex).toBeGreaterThanOrEqual(0)
    expect(loginIndex).toBeGreaterThan(csrfIndex)
    expect(calls[loginIndex]!.headers['X-XSRF-TOKEN']).toBe('participant-xsrf=')
    expect(calls.slice(loginIndex + 1).some((call) => isCall(call, 'GET', '/api/v1/auth/me'))).toBe(
      true,
    )

    expect(calls.every((call) => call.credentials === 'include')).toBe(true)
    expect(calls.some(hasAuthorizationHeader)).toBe(false)
    expect(appStorageKeys()).toEqual([])
  })

  it('signs an Ambassador in to the Ambassador workspace', async () => {
    const calls = recordFetches()
    renderApp('/login')

    await signIn(ambassadorUser.email)

    expect(await screen.findByRole('heading', { name: /welcome back, amb/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/ambassador navigation/i)).toBeInTheDocument()
    expect(calls.some(hasAuthorizationHeader)).toBe(false)
  })

  it.each(['BUSINESS', 'AMBASSADOR'] as const)(
    'registers a %s account into the email verification gate without a token',
    async (role) => {
      const calls = recordFetches()
      const user = userEvent.setup()
      renderApp('/register')

      await user.selectOptions(await screen.findByLabelText(/joining as/i), role)
      await user.type(screen.getByLabelText(/full name/i), 'New Participant')
      await user.type(screen.getByLabelText(/^email$/i), 'new@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'DemoPass123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'DemoPass123!')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      // GuestOnly briefly renders the gate inside the public shell before the workspace
      // route commits, so wait for the workspace route's gate rather than the first heading.
      await waitFor(() => {
        expect(window.location.pathname).toBe(
          role === 'BUSINESS' ? '/app/business' : '/app/ambassador',
        )
        expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument()
      })
      expect(
        screen.getByRole('heading', { name: /verify your email to continue/i }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/business navigation/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/ambassador navigation/i)).not.toBeInTheDocument()
      expect(currentUser?.role).toBe(role)

      const registerIndex = calls.findIndex((call) => isCall(call, 'POST', '/api/v1/auth/register'))
      expect(registerIndex).toBeGreaterThan(
        calls.findIndex((call) => isCall(call, 'GET', '/sanctum/csrf-cookie')),
      )
      expect(
        calls.slice(registerIndex + 1).some((call) => isCall(call, 'GET', '/api/v1/auth/me')),
      ).toBe(true)
      expect(calls.some(hasAuthorizationHeader)).toBe(false)
    },
  )

  it('ignores a token if one is ever returned to the browser', async () => {
    const calls = recordFetches()
    server.use(
      http.post('/api/v1/auth/login', () => {
        currentUser = businessUser
        return HttpResponse.json({
          success: true,
          data: { user: businessUser, token: 'legacy-pat-value', token_type: 'Bearer' },
        })
      }),
    )
    renderApp('/login')

    await signIn(businessUser.email)

    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
    expect(calls.some(hasAuthorizationHeader)).toBe(false)
    expect(JSON.stringify(calls)).not.toContain('legacy-pat-value')
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('legacy-pat-value')
  })

  it('refuses Admin accounts and clears the session they created', async () => {
    const calls = recordFetches()
    renderApp('/login')

    await signIn(adminUser.email)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Admin accounts use the Admin Control application.',
    )
    expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
    expect(calls.some((call) => isCall(call, 'POST', '/api/v1/auth/logout'))).toBe(true)
    expect(currentUser).toBeNull()
  })

  it('restores an existing session from the cookie without re-submitting credentials', async () => {
    currentUser = businessUser
    const calls = recordFetches()
    renderApp('/app/business')

    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
    expect(calls.some((call) => isCall(call, 'GET', '/api/v1/auth/me'))).toBe(true)
    expect(calls.some((call) => isCall(call, 'POST', '/api/v1/auth/login'))).toBe(false)
    expect(calls.some(hasAuthorizationHeader)).toBe(false)
  })

  it('keeps unverified sessions behind the email verification gate on restore', async () => {
    currentUser = { ...ambassadorUser, email_verified_at: null }
    renderApp('/app/ambassador')

    expect(
      await screen.findByRole('heading', { name: /verify your email to continue/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/ambassador navigation/i)).not.toBeInTheDocument()
  })

  it.each(['suspended', 'banned'] as const)(
    'routes a %s session to the account-blocked page',
    async (status) => {
      currentUser = { ...businessUser, status }
      renderApp('/app/business')

      expect(
        await screen.findByRole('heading', { name: /account access limited/i }),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/business navigation/i)).not.toBeInTheDocument()
    },
  )

  it('shows the account status message when sign in is refused with 403', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'forbidden',
              message: 'This account is not permitted to access the platform.',
            },
          },
          { status: 403 },
        ),
      ),
    )
    renderApp('/login')

    await signIn(businessUser.email)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This account is not permitted to access the platform.',
    )
    expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('logs out through the CSRF-protected API and returns to sign in', async () => {
    document.cookie = 'XSRF-TOKEN=participant-xsrf; path=/'
    currentUser = businessUser
    const calls = recordFetches()
    const user = userEvent.setup()
    renderApp('/app/business')

    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
    const logout = calls.find((call) => isCall(call, 'POST', '/api/v1/auth/logout'))
    expect(logout?.headers['X-XSRF-TOKEN']).toBe('participant-xsrf')
    expect(logout?.credentials).toBe('include')
    expect(currentUser).toBeNull()
  })

  it('returns an expired session to sign in', async () => {
    currentUser = businessUser
    server.use(
      http.get('/api/v1/deals', () => {
        currentUser = null
        return unauthenticated()
      }),
    )
    renderApp('/app/business')

    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/business navigation/i)).not.toBeInTheDocument()
  })

  it('does not sign in when the CSRF token is rejected with 419', async () => {
    const calls = recordFetches()
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'server_error', message: 'An unexpected error occurred.' },
          },
          { status: 419 },
        ),
      ),
    )
    renderApp('/login')

    await signIn(businessUser.email)

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.')
    expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
    const loginIndex = calls.findIndex((call) => isCall(call, 'POST', '/api/v1/auth/login'))
    expect(calls.slice(loginIndex + 1).some((call) => isCall(call, 'GET', '/api/v1/auth/me'))).toBe(
      false,
    )
  })
})
