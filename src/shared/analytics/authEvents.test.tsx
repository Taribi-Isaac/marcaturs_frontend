import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import type { AuthUser } from '@/shared/types/auth'

vi.mock('@/shared/analytics/track', () => ({
  trackLogin: vi.fn(),
  trackSignUp: vi.fn(),
  trackSignUpStart: vi.fn(),
}))

import { trackLogin, trackSignUp, trackSignUpStart } from '@/shared/analytics/track'

const user: AuthUser = {
  id: 4,
  name: 'Ada Okonkwo',
  email: 'ada@example.com',
  role: 'AMBASSADOR',
  status: 'active',
  email_verified_at: '2026-10-30T00:00:00Z',
  last_login_at: null,
  created_at: null,
}

function authValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'unauthenticated',
    user: null,
    isBootstrapping: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  }
}

describe('auth analytics events', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('emits login only after the session call succeeds', async () => {
    const userEvents = userEvent.setup()
    const login = vi.fn().mockResolvedValue(user)
    render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue({ login })}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    await userEvents.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvents.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvents.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(login).toHaveBeenCalled()
    expect(trackLogin).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(vi.mocked(trackLogin).mock.calls)).not.toContain('ada@')
  })

  it('does not emit login when the session call fails', async () => {
    const userEvents = userEvent.setup()
    const login = vi.fn().mockRejectedValue(new Error('nope'))
    render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue({ login })}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    await userEvents.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvents.type(screen.getByLabelText('Password'), 'wrong')
    await userEvents.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(trackLogin).not.toHaveBeenCalled()
  })

  it('emits registration completion only after the account is created', async () => {
    const userEvents = userEvent.setup()
    const register = vi.fn().mockResolvedValue(user)
    render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue({ register })}>
          <RegisterPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    await userEvents.type(screen.getByLabelText('Full name'), 'Ada Okonkwo')
    await userEvents.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvents.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvents.type(screen.getByLabelText('Confirm password'), 'correct-horse')
    await userEvents.click(screen.getByRole('button', { name: 'Create account' }))
    expect(trackSignUpStart).toHaveBeenCalledWith('AMBASSADOR')
    expect(trackSignUp).toHaveBeenCalledWith('AMBASSADOR')
    const serialized = JSON.stringify(vi.mocked(trackSignUp).mock.calls)
    expect(serialized).not.toContain('ada@')
    expect(serialized).not.toContain('Okonkwo')
  })

  it('does not emit registration completion when account creation fails', async () => {
    const userEvents = userEvent.setup()
    const register = vi.fn().mockRejectedValue(new Error('taken'))
    render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue({ register })}>
          <RegisterPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    await userEvents.type(screen.getByLabelText('Full name'), 'Ada Okonkwo')
    await userEvents.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvents.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvents.type(screen.getByLabelText('Confirm password'), 'correct-horse')
    await userEvents.click(screen.getByRole('button', { name: 'Create account' }))
    expect(trackSignUpStart).toHaveBeenCalledTimes(1)
    expect(trackSignUp).not.toHaveBeenCalled()
  })
})
