import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

const businessUser: {
  id: number
  name: string
  email: string
  role: string
  status: string
  email_verified_at: string | null
  last_login_at: null
  created_at: null
} = {
  id: 1,
  name: 'Biz User',
  email: 'biz@example.com',
  role: 'BUSINESS',
  status: 'active',
  email_verified_at: '2026-01-01T00:00:00+00:00',
  last_login_at: null,
  created_at: null,
}

const ambassadorUser = {
  ...businessUser,
  id: 2,
  name: 'Amb User',
  email: 'amb@example.com',
  role: 'AMBASSADOR',
}

const campaign = {
  id: 82,
  title: 'Demo Solar Street Light Kits',
  status: 'active',
  category: { id: 1, name: 'Energy', slug: 'energy', listing_status: 'assignable' },
  business: {
    legal_name: 'Ada Solar Ventures Ltd',
    trading_name: 'Ada Solar',
    verification_status: 'verified',
  },
  product_name: 'Solar street light installation kit',
  product_description: 'Kit description',
  pricing_method: 'fixed',
  price_amount: '250000.00',
  price_currency: 'NGN',
  commission_type: 'percentage',
  commission_rate: '12.00',
  commission_amount: null,
  commission_trigger: 'payment_confirmation',
  service_area: 'Lagos',
  version_number: 1,
  is_featured: false,
  cover_image: {
    available: true,
    url: 'http://localhost/api/v1/marketplace/campaigns/82/cover',
  },
  listing_starts_at: null,
  listing_expires_at: null,
}

let currentUser: typeof businessUser | null = null

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (!currentUser) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'unauthenticated', message: 'Authentication is required.' },
        },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: currentUser })
  }),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    if (body.email.startsWith('biz')) currentUser = businessUser
    else currentUser = ambassadorUser
    return HttpResponse.json({
      success: true,
      data: { user: currentUser, token: 't', token_type: 'Bearer' },
    })
  }),
  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      role: 'BUSINESS' | 'AMBASSADOR'
      name: string
      email: string
    }
    currentUser =
      body.role === 'BUSINESS'
        ? { ...businessUser, name: body.name, email: body.email, email_verified_at: null }
        : { ...ambassadorUser, name: body.name, email: body.email, email_verified_at: null }
    return HttpResponse.json({
      success: true,
      data: { user: currentUser, token: 't', token_type: 'Bearer' },
    })
  }),
  http.post('/api/v1/auth/logout', () => {
    currentUser = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/categories', () =>
    HttpResponse.json({
      success: true,
      data: [{ id: 1, name: 'Energy', slug: 'energy', listing_status: 'allowed', sort_order: 1 }],
    }),
  ),
  http.get('/api/v1/marketplace/campaigns', () =>
    HttpResponse.json({
      success: true,
      data: [campaign],
      meta: {
        pagination: { current_page: 1, per_page: 12, total: 1, last_page: 1, from: 1, to: 1 },
      },
    }),
  ),
  http.get('/api/v1/marketplace/campaigns/:id', () =>
    HttpResponse.json({
      success: true,
      data: {
        ...campaign,
        commission_payment_deadline_days: 7,
        qualifying_conditions: 'Confirmed payment',
        payment_destination_name: 'Ada Solar',
        payment_provider: 'Bank transfer',
        marketing_links: [],
        marketing_resources: [],
        official_payment: {
          token: 'tok',
          path: '/api/v1/public/official-payment-information/tok',
          share_path: '/pay/tok',
          share_url: null,
        },
      },
    }),
  ),
  http.get(
    '/api/v1/marketplace/campaigns/:id/cover',
    () =>
      new HttpResponse(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      }),
  ),
  http.get('/api/v1/campaigns', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/deals', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 50, total: 0 } },
    }),
  ),
  http.get('/api/v1/commissions', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/disputes', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 15, total: 0 } },
    }),
  ),
  http.get('/api/v1/notifications', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } },
    }),
  ),
  http.get('/api/v1/verification/status', () =>
    HttpResponse.json({
      success: true,
      data: { overall_status: 'VERIFIED', requirements: [] },
    }),
  ),
  http.get('/api/v1/conversations', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } },
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

beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  currentUser = null
  server.resetHandlers()
})
afterAll(() => server.close())

function renderApp(path = '/') {
  window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  return render(
    <AppProviders queryClient={queryClient}>
      <AppRouter />
    </AppProviders>,
  )
}

describe('public experience', () => {
  it('renders homepage hero and marketplace preview', async () => {
    renderApp('/')
    expect(
      await screen.findByRole('heading', {
        name: /more reach for businesses/i,
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Demo Solar Street Light Kits/i)).toBeInTheDocument()
  })

  it('routes discover and campaign detail', async () => {
    renderApp('/discover')
    expect(
      await screen.findByRole('heading', { name: /find an offer worth promoting/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Demo Solar Street Light Kits/i)).toBeInTheDocument()
    const discoverCovers = screen.getAllByRole('img', {
      name: /Cover image for Demo Solar Street Light Kits/i,
    })
    expect(discoverCovers.length).toBeGreaterThan(0)
    expect(discoverCovers[0]).toHaveAttribute('src', '/api/v1/marketplace/campaigns/82/cover')
    expect(screen.queryByText(/storage\/|campaign-media|disk/i)).not.toBeInTheDocument()

    cleanup()
    renderApp('/campaigns/82')
    expect(
      await screen.findByRole('heading', { name: /Demo Solar Street Light Kits/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/12% commission/i).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('img', { name: /Cover image for Demo Solar Street Light Kits/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/storage\/|campaign-media|disk/i)).not.toBeInTheDocument()
  })
})

describe('auth and role gates', () => {
  it('logs in a business user into the business shell', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(await screen.findByLabelText(/^email$/i), 'biz@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'DemoPass123!')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
  })

  it('registers an ambassador into the email verification gate', async () => {
    const user = userEvent.setup()
    renderApp('/register')
    await user.selectOptions(await screen.findByLabelText(/joining as/i), 'AMBASSADOR')
    await user.type(screen.getByLabelText(/full name/i), 'Ada Ambassador')
    await user.type(screen.getByLabelText(/^email$/i), 'amb@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'DemoPass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'DemoPass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(
      await screen.findByRole('heading', { name: /verify your email to continue/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/ambassador navigation/i)).not.toBeInTheDocument()
  })

  it('blocks business routes for ambassadors', async () => {
    currentUser = ambassadorUser
    renderApp('/app/business')
    expect(await screen.findByLabelText(/ambassador navigation/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated users from business shell to login', async () => {
    renderApp('/app/business/campaigns')
    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('logs out from business shell', async () => {
    currentUser = businessUser
    const user = userEvent.setup()
    renderApp('/app/business')
    expect(await screen.findByRole('heading', { name: /welcome back, biz/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument()
  })
})
