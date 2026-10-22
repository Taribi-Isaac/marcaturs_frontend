import { cleanup, render, screen, within } from '@testing-library/react'
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

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

function renderContact() {
  window.history.pushState({}, '', '/contact')
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

describe('Contact page', () => {
  it('lists the three official email addresses as mailto links', async () => {
    renderContact()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contact MarcatursHub' }),
    ).toBeInTheDocument()

    const addresses = [
      ['info@marcaturshub.com.ng', 'General Enquiries'],
      ['contact@marcaturshub.com.ng', 'Direct Contact'],
      ['support@marcaturshub.com.ng', 'Support'],
    ] as const

    for (const [address, heading] of addresses) {
      const section = screen.getByRole('heading', { level: 2, name: heading }).closest('div')
      expect(section).toBeTruthy()
      const link = within(section as HTMLElement).getByRole('link', { name: address })
      expect(link).toHaveAttribute('href', `mailto:${address}`)
      expect(link).toBeVisible()
    }

    expect(
      screen.queryByText(/contact details pending company confirmation/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/have not been finalised/i)).not.toBeInTheDocument()
    expect(document.querySelector('form')).not.toBeInTheDocument()

    const main = document.getElementById('main') as HTMLElement
    expect(within(main).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    expect(within(main).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/how-it-works',
    )
  })
})
