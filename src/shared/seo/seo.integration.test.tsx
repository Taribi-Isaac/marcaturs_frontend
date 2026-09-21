import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'

const campaignDetail = {
  id: 82,
  title: 'Demo Solar Street Light Kits',
  status: 'active',
  category: { id: 1, name: 'Energy', slug: 'energy', listing_status: 'assignable' },
  business: {
    legal_name: 'Ada Solar Ventures Ltd',
    trading_name: 'Ada Solar',
    verification_status: 'verified',
    description: null,
    operating_location: null,
    website: null,
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
    url: '/api/v1/marketplace/campaigns/82/cover',
  },
  listing_starts_at: null,
  listing_expires_at: null,
  commission_trigger_description: null,
  commission_payment_deadline_days: 7,
  minimum_qualifying_amount: null,
  qualifying_conditions: 'Confirmed payment',
  refund_cancellation_rules: null,
  approved_claims: null,
  prohibited_claims: null,
  brand_use_rules: null,
  geographic_customer_restrictions: null,
  approved_copy: null,
  marketing_links: [] as string[],
  terms: null,
  payment_destination_name: 'Ada Solar',
  payment_provider: 'Bank transfer',
  marketing_resources: [] as unknown[],
  official_payment: {
    token: 'tok',
    path: '/api/v1/public/official-payment-information/tok',
    share_path: '/pay/tok',
    share_url: null,
  },
}

let campaignPayload: typeof campaignDetail = campaignDetail

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () =>
    HttpResponse.json(
      {
        success: false,
        error: { code: 'unauthenticated', message: 'Authentication is required.' },
      },
      { status: 401 },
    ),
  ),
  http.get('/api/v1/categories', () =>
    HttpResponse.json({
      success: true,
      data: [{ id: 1, name: 'Energy', slug: 'energy', listing_status: 'allowed', sort_order: 1 }],
    }),
  ),
  http.get('/api/v1/marketplace/campaigns', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: {
        pagination: { current_page: 1, last_page: 1, per_page: 12, total: 0, from: null, to: null },
      },
    }),
  ),
  http.get('/api/v1/marketplace/campaigns/:id', ({ params }) => {
    if (String(params.id) !== '82') {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: campaignPayload })
  }),
  http.get(
    '/api/v1/marketplace/campaigns/:id/cover',
    () =>
      new HttpResponse(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  campaignPayload = { ...campaignDetail, status: 'active' }
  window.history.pushState({}, '', '/')
})
afterAll(() => server.close())

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  const client = createQueryClient()
  return render(
    <AppProviders queryClient={client}>
      <AppRouter />
    </AppProviders>,
  )
}

describe('SEO integration (MH-FE-023)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_ORIGIN', 'https://public.example')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('applies public metadata on discover', async () => {
    renderAt('/discover')
    await waitFor(() => {
      expect(document.title).toMatch(/Discover campaigns/i)
    })
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://public.example/discover',
    )
  })

  it('applies campaign metadata from public marketplace data when active', async () => {
    renderAt('/campaigns/82')
    await screen.findByRole('heading', { name: /Demo Solar Street Light Kits/i })
    await waitFor(() => {
      expect(document.title).toMatch(/Demo Solar Street Light Kits/i)
    })
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://public.example/campaigns/82',
    )
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://public.example/api/v1/marketplace/campaigns/82/cover',
    )
  })

  it('marks expired public campaign detail as noindex', async () => {
    campaignPayload = { ...campaignDetail, status: 'expired' }
    renderAt('/campaigns/82')
    await screen.findByRole('heading', { name: /Demo Solar Street Light Kits/i })
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      )
    })
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })

  it('force-noindexes login without canonical', async () => {
    renderAt('/login')
    await screen.findByRole('heading', { name: /sign in/i })
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      )
    })
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
  })
})
