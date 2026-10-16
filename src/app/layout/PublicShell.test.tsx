import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

let currentUser: Record<string, unknown> | null = null

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () =>
    currentUser
      ? HttpResponse.json({ success: true, data: currentUser })
      : HttpResponse.json(
          { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          { status: 401 },
        ),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  currentUser = null
})
afterAll(() => server.close())

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

function menuToggle() {
  return screen.getByRole('button', { name: 'Menu' })
}

function drawer() {
  return document.getElementById('mobile-nav') as HTMLElement
}

describe('public header mobile menu (MH-REL-001)', () => {
  it('opens and closes the menu with links and account actions inside it', async () => {
    const user = userEvent.setup()
    renderApp('/about')
    await waitFor(() =>
      expect(within(drawer()).getByRole('link', { name: 'Sign in' })).toBeInTheDocument(),
    )

    const toggle = menuToggle()
    expect(toggle).toHaveAttribute('aria-controls', 'mobile-nav')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(drawer()).not.toHaveClass('is-open')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(drawer()).toHaveClass('is-open')
    for (const name of ['Discover', 'How it works', 'For businesses', 'For ambassadors']) {
      expect(within(drawer()).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(drawer()).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(within(drawer()).getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/register',
    )

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(drawer()).not.toHaveClass('is-open')
  })

  it('navigates from the menu and closes it', async () => {
    const user = userEvent.setup()
    renderApp('/about')
    await user.click(menuToggle())

    await user.click(within(drawer()).getByRole('link', { name: 'Sign in' }))
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(drawer()).not.toHaveClass('is-open')
    expect(menuToggle()).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuToggle())
    await user.click(within(drawer()).getByRole('link', { name: 'How it works' }))
    await waitFor(() => expect(window.location.pathname).toBe('/how-it-works'))
    expect(drawer()).not.toHaveClass('is-open')
  })

  it('operates the menu from the keyboard', async () => {
    const user = userEvent.setup()
    renderApp('/about')
    const toggle = menuToggle()

    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.tab()
    expect(document.activeElement?.closest('#mobile-nav')).not.toBeNull()

    toggle.focus()
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers signed-in account actions inside the menu', async () => {
    currentUser = {
      id: 1,
      name: 'Ada',
      email: 'ada@example.com',
      role: 'BUSINESS',
      status: 'active',
      email_verified_at: '2026-01-01T00:00:00+00:00',
      last_login_at: null,
      created_at: null,
    }
    renderApp('/about')

    const openApp = await within(drawer()).findByRole('link', { name: 'Open app' })
    expect(openApp).toHaveAttribute('href', '/app/business')
    expect(within(drawer()).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(within(drawer()).queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })
})

describe('public footer social links (MH-REL-001)', () => {
  it('lists Facebook, Instagram, and LinkedIn with accessible names', async () => {
    renderApp('/about')
    await screen.findByRole('heading', { name: /about/i }).catch(() => undefined)

    const footer = document.querySelector('footer.site-footer') as HTMLElement
    expect(footer).toBeTruthy()
    expect(
      within(footer).getByLabelText(/Facebook \(link destination awaiting confirmation\)/i),
    ).toBeInTheDocument()
    expect(
      within(footer).getByLabelText(/Instagram \(link destination awaiting confirmation\)/i),
    ).toBeInTheDocument()
    expect(
      within(footer).getByLabelText(/LinkedIn \(link destination awaiting confirmation\)/i),
    ).toBeInTheDocument()
    expect(within(footer).queryByRole('link', { name: /Facebook/i })).not.toBeInTheDocument()
  })
})
