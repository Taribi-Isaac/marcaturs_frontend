import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

let lastResetBody: Record<string, unknown> | null = null
let resetHandlerMode: 'ok' | 'invalid' | 'validation' | 'rate' | 'server' = 'ok'
let resetUserRole: string | null = 'BUSINESS'

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () =>
    HttpResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
      { status: 401 },
    ),
  ),
  http.post('/api/v1/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as { email?: string }
    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: { email: ['The email field must be a valid email address.'] },
          },
        },
        { status: 400 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        message: 'If that email address is registered, a password reset link has been sent.',
      },
    })
  }),
  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    lastResetBody = (await request.json()) as Record<string, unknown>
    if (resetHandlerMode === 'invalid') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message: 'This password reset token is invalid.',
          },
        },
        { status: 422 },
      )
    }
    if (resetHandlerMode === 'validation') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: { password: ['The password field must be at least 8 characters.'] },
          },
        },
        { status: 400 },
      )
    }
    if (resetHandlerMode === 'rate') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'rate_limited', message: 'Too many attempts. Please try again later.' },
        },
        { status: 429 },
      )
    }
    if (resetHandlerMode === 'server') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'server_error', message: 'An unexpected error occurred.' },
        },
        { status: 500 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        message: 'Your password has been reset.',
        ...(resetUserRole ? { user: { role: resetUserRole } } : {}),
      },
    })
  }),
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

describe('MH-FE-022 password reset', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    lastResetBody = null
    resetHandlerMode = 'ok'
    resetUserRole = 'BUSINESS'
    vi.unstubAllEnvs()
  })
  afterAll(() => server.close())

  beforeEach(() => {
    lastResetBody = null
    resetHandlerMode = 'ok'
    resetUserRole = 'BUSINESS'
    vi.stubEnv('VITE_ADMIN_FRONTEND_URL', 'http://localhost:5174')
  })

  it('renders forgot-password and shows anti-enumeration success', async () => {
    const user = userEvent.setup()
    renderApp('/forgot-password')

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^email$/i), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      await screen.findByText(
        /if that email address is registered, a password reset link has been sent/i,
      ),
    ).toBeInTheDocument()
  })

  it('shows missing-link state when reset query params are absent', async () => {
    renderApp('/reset-password')
    expect(screen.getByRole('heading', { name: /reset link incomplete/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new password reset/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('submits reset with token and email from the query string', async () => {
    const user = userEvent.setup()
    renderApp('/reset-password?token=demo-token&email=ada%40example.com')

    expect(screen.getByRole('heading', { name: /choose a new password/i })).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    await waitFor(() => {
      expect(lastResetBody).toEqual({
        email: 'ada@example.com',
        token: 'demo-token',
        password: 'NewPass123!',
        password_confirmation: 'NewPass123!',
      })
    })

    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/your password has been reset/i)
    expect(screen.getByRole('link', { name: 'Sign in to MarcatursHub' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.queryByRole('link', { name: 'Administrator sign in' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/reset-password')
    expect(window.location.search).toBe('')
    expect(document.body.textContent).not.toContain('demo-token')
  })

  it('sends an administrator to Admin Control sign-in', async () => {
    const user = userEvent.setup()
    resetUserRole = 'ADMIN'
    renderApp('/reset-password?token=demo-token&email=admin%40example.com&redirect=https://evil.example')

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    const adminLink = await screen.findByRole('link', { name: 'Administrator sign in' })
    expect(adminLink).toHaveAttribute('href', 'http://localhost:5174/login')
    expect(screen.queryByRole('link', { name: 'Sign in to MarcatursHub' })).not.toBeInTheDocument()
    expect(window.location.href).not.toContain('evil.example')
    expect(window.location.search).toBe('')
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toContain('evil.example')
    }
  })

  it('offers both sign-in destinations when the reset response has no role', async () => {
    const user = userEvent.setup()
    resetUserRole = null
    renderApp('/reset-password?token=demo-token&email=ada@example.com')

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    expect(await screen.findByRole('link', { name: 'Sign in to MarcatursHub' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.getByRole('link', { name: 'Administrator sign in' })).toHaveAttribute(
      'href',
      'http://localhost:5174/login',
    )
  })

  it('does not link an administrator to an invalid admin origin', async () => {
    const user = userEvent.setup()
    resetUserRole = 'ADMIN'
    vi.stubEnv('VITE_ADMIN_FRONTEND_URL', 'https://admin.example.test/phish')
    renderApp('/reset-password?token=demo-token&email=admin@example.com')

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    expect(await screen.findByRole('heading', { name: /password updated/i })).toBeInTheDocument()
    expect(
      screen.getByText('Administrator sign-in is not configured for this application.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administrator sign in' })).not.toBeInTheDocument()
    expect(window.location.href).not.toContain('phish')
  })

  it('blocks submit when passwords do not match', async () => {
    const user = userEvent.setup()
    renderApp('/reset-password?token=demo-token&email=ada@example.com')

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'Different123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument()
    expect(lastResetBody).toBeNull()
  })

  it('shows invalid-link recovery when the token is rejected', async () => {
    const user = userEvent.setup()
    resetHandlerMode = 'invalid'
    renderApp('/reset-password?token=bad&email=ada@example.com')

    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))

    expect(
      await screen.findByRole('heading', { name: /reset link unavailable/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new password reset/i })).toBeInTheDocument()
  })

  it('surfaces server validation and rate-limit errors', async () => {
    const user = userEvent.setup()
    resetHandlerMode = 'validation'
    renderApp('/reset-password?token=demo-token&email=ada@example.com')

    await user.type(screen.getByLabelText(/^new password$/i), 'short1!!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'short1!!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))
    expect(
      await screen.findByText(/password field must be at least 8 characters/i),
    ).toBeInTheDocument()

    cleanup()
    resetHandlerMode = 'rate'
    renderApp('/reset-password?token=demo-token&email=ada@example.com')
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass123!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: /^reset password$/i }))
    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument()
  })

  it('links forgot password from the login page', async () => {
    renderApp('/login')
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
