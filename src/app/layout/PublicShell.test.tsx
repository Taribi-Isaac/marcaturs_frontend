import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { footerClickScrollMode } from '@/app/layout/footerScroll'
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

describe('public footer social links', () => {
  it('lists the five official profiles as safe external links', async () => {
    renderApp('/about')
    await screen.findByRole('heading', { name: /about/i }).catch(() => undefined)

    const footer = document.querySelector('footer.site-footer') as HTMLElement
    expect(footer).toBeTruthy()

    const profiles = [
      ['Facebook', 'https://www.facebook.com/marcaturshub'],
      ['Instagram', 'https://www.instagram.com/marcaturshub'],
      ['LinkedIn', 'https://www.linkedin.com/company/marcaturshub'],
      ['TikTok', 'https://www.tiktok.com/@marcaturshub'],
      ['X', 'https://x.com/MarcatursHub'],
      ['YouTube', 'https://www.youtube.com/channel/UCfY4uW6OeOoZNMF1TOkaTBw'],  
    ] as const

    for (const [label, href] of profiles) {
      const link = within(footer).getByRole('link', { name: `${label} (opens in a new tab)` })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveTextContent(label)
    }

    expect(within(footer).getAllByRole('link', { name: /\(opens in a new tab\)/ })).toHaveLength(6)
    expect(within(footer).queryByText(/awaiting confirmation/i)).not.toBeInTheDocument()
  })
})

function footer() {
  return document.querySelector('footer.site-footer') as HTMLElement
}

const plainClick = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
}

describe('footer internal navigation scroll', () => {
  it('keeps a destination query string when deciding to scroll', () => {
    const current = { pathname: '/about', search: '?ref=campaign', hash: '' }
    const destination = new URL('http://localhost/faq?topic=payment')
    expect(footerClickScrollMode(plainClick, current, destination)).toBe('on-next-location')
    expect(destination.search).toBe('?topic=payment')
  })

  it('leaves hash destinations and modified clicks unchanged', () => {
    const current = { pathname: '/about', search: '', hash: '' }
    expect(
      footerClickScrollMode(plainClick, current, new URL('http://localhost/faq#answers')),
    ).toBe('ignore')
    expect(
      footerClickScrollMode(
        { ...plainClick, ctrlKey: true },
        current,
        new URL('http://localhost/faq'),
      ),
    ).toBe('ignore')
  })

  it('opens the footer destination at the top and preserves that destination URL', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp('/about?ref=campaign')

    const link = within(footer()).getByRole('link', { name: 'How it works' })
    expect(link).toHaveAttribute('href', '/how-it-works')
    await user.click(link)

    await waitFor(() => expect(window.location.pathname).toBe('/how-it-works'))
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.documentElement.style.scrollBehavior).toBe('')
    const main = document.getElementById('main') as HTMLElement
    expect(main).toBeVisible()
    expect(within(main).getByRole('heading', { level: 1 })).toBeVisible()

    scrollTo.mockClear()
    window.history.back()
    await waitFor(() => expect(window.location.pathname).toBe('/about'))
    expect(window.location.search).toBe('?ref=campaign')
    expect(scrollTo).not.toHaveBeenCalled()
    scrollTo.mockRestore()
  })

  it('scrolls to the top when the footer link targets the current page', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp('/faq')

    const link = within(footer()).getByRole('link', { name: 'FAQ' })
    link.focus()
    await user.keyboard('{Enter}')

    expect(window.location.pathname).toBe('/faq')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(document.getElementById('main')).toBeVisible()
    scrollTo.mockRestore()
  })

  it('does not reset scroll for header links, hash links, or external profiles', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp('/about')

    const primary = screen.getByRole('navigation', { name: 'Primary' })
    await user.click(within(primary).getByRole('link', { name: 'Discover' }))
    await waitFor(() => expect(window.location.pathname).toBe('/discover'))
    expect(scrollTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('link', { name: 'Skip to main content' }))
    expect(window.location.hash).toBe('#main')
    expect(scrollTo).not.toHaveBeenCalled()

    const social = within(footer()).getByRole('link', { name: 'Facebook (opens in a new tab)' })
    social.addEventListener('click', (event) => event.preventDefault(), { once: true })
    await user.click(social)
    expect(social).toHaveAttribute('href', 'https://www.facebook.com/marcaturshub')
    expect(social).toHaveAttribute('target', '_blank')
    expect(window.location.pathname).toBe('/discover')
    expect(scrollTo).not.toHaveBeenCalled()
    scrollTo.mockRestore()
  })

  it('opens Contact from the footer at the top with the approved email links', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    renderApp('/about')

    await user.click(within(footer()).getByRole('link', { name: 'Contact' }))
    await waitFor(() => expect(window.location.pathname).toBe('/contact'))

    const main = document.getElementById('main') as HTMLElement
    const addresses = [
      'info@marcaturshub.com.ng',
      'contact@marcaturshub.com.ng',
      'support@marcaturshub.com.ng',
    ] as const
    for (const address of addresses) {
      expect(within(main).getByRole('link', { name: address })).toHaveAttribute(
        'href',
        `mailto:${address}`,
      )
    }
    expect(within(main).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    expect(within(main).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/how-it-works',
    )
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    scrollTo.mockRestore()
  })
})
