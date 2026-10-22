import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () =>
    HttpResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
      { status: 401 },
    ),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

describe('password visibility', () => {
  it('hides the login password until the toggle is used, then preserves the value', async () => {
    const user = userEvent.setup()
    renderAt('/login')

    const password = await screen.findByLabelText(/^password$/i)
    expect(password).toHaveAttribute('type', 'password')

    await user.type(password, 'Secret123!')
    const show = screen.getByRole('button', { name: 'Show password' })
    expect(show).toHaveAttribute('type', 'button')
    expect(show).toHaveAttribute('aria-pressed', 'false')

    await user.click(show)
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Secret123!')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('Secret123!')
  })

  it('toggles the login password from the keyboard', async () => {
    const user = userEvent.setup()
    renderAt('/login')

    const password = await screen.findByLabelText(/^password$/i)
    await user.type(password, 'Secret123!')
    screen.getByRole('button', { name: 'Show password' }).focus()
    await user.keyboard('{Enter}')
    expect(password).toHaveAttribute('type', 'text')
    await user.keyboard(' ')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('Secret123!')
  })

  it('toggles the registration password and confirmation independently', async () => {
    const user = userEvent.setup()
    renderAt('/register')

    const password = await screen.findByLabelText(/^password$/i)
    const confirmation = screen.getByLabelText(/^confirm password$/i)
    expect(password).toHaveAttribute('type', 'password')
    expect(confirmation).toHaveAttribute('type', 'password')

    await user.type(password, 'Secret123!')
    await user.type(confirmation, 'Other123!')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(confirmation).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('Secret123!')
    expect(confirmation).toHaveValue('Other123!')

    await user.click(screen.getByRole('button', { name: 'Show confirm password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(confirmation).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(confirmation).toHaveAttribute('type', 'text')
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.queryByText('Enter your name')).not.toBeInTheDocument()
  })
})
