import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { AuthUser } from '@/shared/types/auth'

const newUser: AuthUser = {
  id: 99,
  name: 'New Participant',
  email: 'new@example.com',
  role: 'AMBASSADOR',
  status: 'active',
  email_verified_at: null,
  last_login_at: null,
  created_at: null,
}

let currentUser: AuthUser | null = null
let registerMode:
  | 'success'
  | 'email_taken'
  | 'multi_field'
  | 'malformed_only'
  | 'rate_limited'
  | 'network' = 'success'

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
  http.post('/api/v1/auth/register', async ({ request }) => {
    if (registerMode === 'network') {
      return HttpResponse.error()
    }
    const body = (await request.json()) as {
      role?: 'BUSINESS' | 'AMBASSADOR'
      name?: string
      email?: string
    }
    if (registerMode === 'email_taken') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: { email: ['The email has already been taken.'] },
          },
        },
        { status: 400 },
      )
    }
    if (registerMode === 'multi_field') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: {
              name: ['The name field is required.'],
              email: ['The email has already been taken.'],
              password: ['The password field must be at least 8 characters.'],
            },
          },
        },
        { status: 400 },
      )
    }
    if (registerMode === 'malformed_only') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: {
              is_admin: ['ignored unknown key'],
              password: [],
              mystery: null,
            },
          },
        },
        { status: 400 },
      )
    }
    if (registerMode === 'rate_limited') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'rate_limited', message: 'Too many attempts. Please try again later.' },
        },
        { status: 429 },
      )
    }
    currentUser = {
      ...newUser,
      name: body.name ?? newUser.name,
      email: body.email ?? newUser.email,
      role: body.role === 'BUSINESS' ? 'BUSINESS' : 'AMBASSADOR',
      email_verified_at: null,
    }
    return HttpResponse.json({ success: true, data: { user: currentUser } }, { status: 201 })
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

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

async function fillValidRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText(/joining as/i), 'AMBASSADOR')
  await user.type(screen.getByLabelText(/full name/i), 'New Participant')
  await user.type(screen.getByLabelText(/^email$/i), 'new@example.com')
  await user.type(screen.getByLabelText(/^password$/i), 'DemoPass123!')
  await user.type(screen.getByLabelText(/^confirm password$/i), 'DemoPass123!')
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  currentUser = null
  registerMode = 'success'
  server.resetHandlers()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())

describe('MH-OPS-055 registration field-level API validation UX', () => {
  it('Test A — shows the email server validation message on the email field', async () => {
    registerMode = 'email_taken'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/register')
  })

  it('Test B — maps multiple recognized field errors onto their inputs', async () => {
    registerMode = 'multi_field'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('The name field is required.')).toBeInTheDocument()
    expect(screen.getByText('The email has already been taken.')).toBeInTheDocument()
    expect(
      screen.getByText('The password field must be at least 8 characters.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Test C — ignores unknown/malformed details and shows form-level fallback', async () => {
    registerMode = 'malformed_only'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The given data was invalid.')
    expect(screen.queryByText('ignored unknown key')).not.toBeInTheDocument()
  })

  it('Test D — non-validation API errors keep the safe form-level banner', async () => {
    registerMode = 'rate_limited'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again later.',
    )
    expect(screen.queryByText(/already been taken/i)).not.toBeInTheDocument()
  })

  it('Test D — network failures keep the safe form-level banner', async () => {
    registerMode = 'network'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to reach the MarcatursHub API.',
    )
  })

  it('Test E — successful registration still reaches the email verification gate', async () => {
    registerMode = 'success'
    const user = userEvent.setup()
    renderApp('/register')
    await fillValidRegistration(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/app/ambassador')
    })
    expect(
      screen.getByRole('heading', { name: /verify your email to continue/i }),
    ).toBeInTheDocument()
    expect(currentUser?.email_verified_at).toBeNull()
  })

  it('Test F — Zod client validation blocks submit without a backend request', async () => {
    const registerCalls: string[] = []
    const passthrough = globalThis.fetch
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (new URL(url, window.location.origin).pathname === '/api/v1/auth/register') {
        registerCalls.push(url)
      }
      return passthrough(input, init)
    })

    const user = userEvent.setup()
    renderApp('/register')

    await screen.findByRole('heading', { name: /create account/i })
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument()
    expect(registerCalls).toEqual([])
    expect(window.location.pathname).toBe('/register')
  })
})
