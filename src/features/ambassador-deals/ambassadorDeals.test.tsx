import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { Deal, OfficialPaymentInformation, PaymentEvidence } from './types'

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR',
  status: 'active',
}

const business = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS',
  status: 'active',
}

const campaignCard = {
  id: 82,
  title: 'Demo Solar Street Light Kits',
  status: 'active',
  category: { id: 1, name: 'Energy', slug: 'energy', listing_status: 'assignable' },
  business: {
    legal_name: 'Ada Solar Ventures Ltd',
    trading_name: 'Ada Solar',
    verification_status: 'verified',
    operating_location: 'Lagos',
  },
  product_name: 'Solar street light installation kit',
  product_description: 'Install ready kits for streets and estates.',
  pricing_method: 'fixed',
  price_amount: '250000.00',
  price_currency: 'NGN',
  commission_type: 'percentage',
  commission_rate: '12.00',
  commission_amount: null,
  commission_trigger: 'payment_confirmation',
  service_area: 'Lagos',
  version_number: 1,
  is_featured: true,
  listing_starts_at: null,
  listing_expires_at: null,
}

const campaignDetail = {
  ...campaignCard,
  commission_trigger_description: 'After business confirms customer payment',
  commission_payment_deadline_days: 7,
  minimum_qualifying_amount: null,
  qualifying_conditions: 'Customer pays in full to Ada Solar.',
  refund_cancellation_rules: null,
  approved_claims: null,
  prohibited_claims: null,
  brand_use_rules: null,
  geographic_customer_restrictions: null,
  approved_copy: null,
  marketing_links: [],
  terms: 'Standard campaign terms',
  payment_destination_name: 'Ada Solar Collections',
  payment_provider: 'Bank transfer',
  official_payment: {
    token: 'paytokenabcdefghijklmnopqrstuvwxyz0123456789abcd',
    path: '/api/v1/public/official-payment-information/paytokenabcdefghijklmnopqrstuvwxyz0123456789abcd',
    share_path: '/pay/paytokenabcdefghijklmnopqrstuvwxyz0123456789abcd',
    share_url: 'http://localhost:5180/pay/paytokenabcdefghijklmnopqrstuvwxyz0123456789abcd',
  },
  marketing_resources: [
    {
      id: 501,
      type: 'image',
      title: 'Hero flyer',
      mime_type: 'image/jpeg',
      size_bytes: 12000,
      sort_order: 1,
    },
  ],
}

const officialPayment: OfficialPaymentInformation = {
  financial_boundary: {
    customer_pays: 'business',
    platform_holds_customer_funds: false,
    statement:
      'Customers pay the Business directly. MarcatursHub does not receive, hold, route, escrow, or process this purchase payment.',
  },
  share: campaignDetail.official_payment,
  business: {
    legal_name: 'Ada Solar Ventures Ltd',
    trading_name: 'Ada Solar',
    operating_location: 'Lagos',
    website: null,
    verification_status: 'verified',
  },
  campaign: {
    id: 82,
    title: campaignCard.title,
    status: 'active',
    category: { id: 1, name: 'Energy', slug: 'energy' },
  },
  campaign_version: {
    version_number: 1,
    status: 'published',
    published_at: '2026-09-01T00:00:00+00:00',
    product_name: campaignCard.product_name,
    product_description: campaignCard.product_description,
    service_area: 'Lagos',
    pricing_method: 'fixed',
    price_amount: '250000.00',
    price_currency: 'NGN',
  },
  payment_destination: {
    destination_name: 'Ada Solar Collections',
    provider: 'Bank transfer',
    account_identifier: '0123456789',
    instructions: 'Use Deal ID as narration.',
    contact: 'payments@ada.example',
  },
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 9001,
    status: 'payment_pending',
    business: { id: 1, name: 'Ada Solar', role: 'BUSINESS' },
    ambassador: { id: 2, name: 'Ada Ambassador', role: 'AMBASSADOR' },
    campaign: { id: 82, title: campaignCard.title, status: 'active' },
    campaign_version: { id: 820, version_number: 1 },
    product_name: campaignCard.product_name,
    pricing_method: 'fixed',
    price_amount: '250000.00',
    price_currency: 'NGN',
    commission_type: 'percentage',
    commission_rate: '12.00',
    commission_amount: null,
    commission_trigger: 'payment_confirmation',
    commission_trigger_description: 'After business confirms customer payment',
    commission_payment_deadline_days: 7,
    minimum_qualifying_amount: null,
    qualifying_conditions: 'Customer pays in full to Ada Solar.',
    expected_transaction_amount: '250000.00',
    confirmed_payment_amount: null,
    confirmed_at: null,
    cancelled_at: null,
    has_open_dispute: false,
    open_dispute_count: 0,
    commission: null,
    events: [],
    created_at: '2026-09-08T10:00:00+00:00',
    updated_at: '2026-09-08T10:00:00+00:00',
    ...overrides,
  }
}

let me: typeof ambassador | typeof business | null = null
let deals: Deal[] = []
let evidenceByDeal: Record<number, PaymentEvidence[]> = {}
let createConflict = false
let createValidation = false
let nextDealId = 9001

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: me })
  }),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    if (body.email.startsWith('business')) me = business
    else me = ambassador
    return HttpResponse.json({ success: true, data: me })
  }),
  http.post('/api/v1/auth/logout', () => {
    me = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/categories', () =>
    HttpResponse.json({
      success: true,
      data: [{ id: 1, name: 'Energy', slug: 'energy', listing_status: 'allowed', sort_order: 1 }],
    }),
  ),
  http.get('/api/v1/marketplace/campaigns', ({ request }) => {
    const url = new URL(request.url)
    const featured = url.searchParams.get('featured')
    const q = url.searchParams.get('q')?.toLowerCase() || ''
    let items = [campaignCard]
    if (featured === 'true') items = items.filter((item) => item.is_featured)
    if (q && !campaignCard.title.toLowerCase().includes(q)) items = []
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: 1,
          per_page: 12,
          total: items.length,
          last_page: 1,
          from: items.length ? 1 : null,
          to: items.length || null,
        },
      },
    })
  }),
  http.get('/api/v1/marketplace/campaigns/:id', ({ params }) => {
    if (Number(params.id) !== campaignCard.id) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: campaignDetail })
  }),
  http.get('/api/v1/public/official-payment-information/:token', ({ params }) => {
    if (params.token !== campaignDetail.official_payment.token) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: officialPayment })
  }),
  http.get('/api/v1/deals', () => {
    if (!me || (me.role !== 'AMBASSADOR' && me.role !== 'BUSINESS')) {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({ success: true, data: deals })
  }),
  http.get('/api/v1/deals/:id', ({ params }) => {
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal || !me || me.role !== 'AMBASSADOR') {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.post('/api/v1/deals', async ({ request }) => {
    if (!me || me.role !== 'AMBASSADOR') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    const body = (await request.json()) as Record<string, unknown>
    if (
      'business_id' in body ||
      'ambassador_id' in body ||
      'campaign_version_id' in body ||
      'commission_rate' in body
    ) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'validation_error', message: 'Protected fields prohibited.' },
        },
        { status: 400 },
      )
    }
    if (createConflict) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'Campaign state changed.' },
        },
        { status: 409 },
      )
    }
    if (createValidation || body.campaign_id !== 82) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message: 'New Deals can only be created for active or expiring campaigns.',
            details: { campaign_id: ['Campaign is not eligible.'] },
          },
        },
        { status: 422 },
      )
    }
    const deal = makeDeal({
      id: nextDealId++,
      expected_transaction_amount:
        body.expected_transaction_amount != null ? String(body.expected_transaction_amount) : null,
    })
    deals = [deal, ...deals]
    evidenceByDeal[deal.id] = []
    return HttpResponse.json({ success: true, data: deal }, { status: 201 })
  }),
  http.post('/api/v1/deals/:id/cancel', async ({ params, request }) => {
    const body = (await request.json()) as { reason?: string }
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (!body.reason) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Invalid',
            details: { reason: ['Reason is required.'] },
          },
        },
        { status: 400 },
      )
    }
    if (deal.status !== 'payment_pending') {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Cannot cancel.' } },
        { status: 409 },
      )
    }
    deal.status = 'cancelled'
    deal.cancelled_at = '2026-09-09T12:00:00+00:00'
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.get('/api/v1/deals/:id/payment-evidence', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({ success: true, data: evidenceByDeal[id] || [] })
  }),
  http.post('/api/v1/deals/:id/payment-evidence', async ({ params, request }) => {
    const id = Number(params.id)
    const form = await request.formData()
    const kind = String(form.get('kind') || '')
    if (!kind) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Invalid',
            details: { kind: ['Kind is required.'] },
          },
        },
        { status: 400 },
      )
    }
    if (kind === 'transaction_reference' && !form.get('reference_number')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Invalid',
            details: { reference_number: ['A payment reference is required.'] },
          },
        },
        { status: 400 },
      )
    }
    const evidence: PaymentEvidence = {
      id: Date.now(),
      deal_id: id,
      kind: kind as PaymentEvidence['kind'],
      status: 'submitted',
      reference_number: (form.get('reference_number') as string) || null,
      amount: (form.get('amount') as string) || null,
      currency: (form.get('currency') as string) || 'NGN',
      paid_on: (form.get('paid_on') as string) || null,
      note: (form.get('note') as string) || null,
      has_file: Boolean(form.get('file')),
      submitted_by: { id: 2, role: 'AMBASSADOR' },
      submitted_at: '2026-09-09T11:00:00+00:00',
      created_at: '2026-09-09T11:00:00+00:00',
    }
    evidenceByDeal[id] = [evidence, ...(evidenceByDeal[id] || [])]
    return HttpResponse.json({ success: true, data: evidence }, { status: 201 })
  }),
  http.get('/api/v1/commissions', () => {
    const items = deals
      .filter((deal) => deal.commission)
      .map((deal) => ({
        id: deal.commission!.id,
        status: deal.commission!.status,
        deal_id: deal.id,
        amount: deal.commission!.amount,
        currency: deal.commission!.currency,
        due_at: deal.commission!.due_at,
        paid_at: deal.commission!.paid_at,
        received_at: deal.commission!.received_at,
        is_overdue: deal.commission!.is_overdue,
      }))
    return HttpResponse.json({ success: true, data: items })
  }),
  http.post('/api/v1/commissions/:id/confirm-received', ({ params }) => {
    const commissionId = Number(params.id)
    const deal = deals.find((item) => item.commission?.id === commissionId)
    if (!deal?.commission || deal.commission.status !== 'paid') {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Not payable.' } },
        { status: 409 },
      )
    }
    deal.commission.status = 'received'
    deal.commission.received_at = '2026-09-09T15:00:00+00:00'
    deal.status = 'completed'
    return HttpResponse.json({ success: true, data: deal.commission })
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = null
  deals = []
  evidenceByDeal = {}
  createConflict = false
  createValidation = false
  nextDealId = 9001
})
afterAll(() => server.close())

describe('MH-FE-P03 ambassador commercial journey', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    })
  })

  it('renders discover campaigns for guests with search and featured', async () => {
    const user = userEvent.setup()
    renderApp('/discover')
    expect(
      await screen.findByRole('heading', { name: /find an offer worth promoting/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/demo solar street light kits/i)).toBeInTheDocument()
    expect(screen.getByText(/highlighted opportunities/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/search/i), 'unmatched')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    expect(await screen.findByText(/no matching campaigns/i)).toBeInTheDocument()
  }, 10000)

  it('shows guest campaign detail without deal creation', async () => {
    renderApp('/campaigns/82')
    expect(
      await screen.findByRole('heading', { name: /demo solar street light kits/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/12% commission/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /sign in to create a deal/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^create deal$/i })).not.toBeInTheDocument()
  })

  it('lets ambassadors create a deal with protected payload only', async () => {
    me = ambassador
    const user = userEvent.setup()
    renderApp('/app/ambassador/deals/new?campaign=82')
    expect(
      await screen.findByRole('heading', { name: /choosing this opportunity to sell/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^create deal$/i }))
    expect(
      await screen.findByRole('heading', { name: /solar street light installation kit/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/deal #9001/i)).toBeInTheDocument()
    expect(screen.getByText(/official payment information/i)).toBeInTheDocument()
  })

  it('handles deal creation 422 validation', async () => {
    me = ambassador
    createValidation = true
    const user = userEvent.setup()
    renderApp('/app/ambassador/deals/new?campaign=82')
    await screen.findByRole('button', { name: /^create deal$/i })
    await user.click(screen.getByRole('button', { name: /^create deal$/i }))
    expect(await screen.findByText(/only be created for active or expiring/i)).toBeInTheDocument()
  })

  it('handles deal creation 409 conflict', async () => {
    me = ambassador
    createConflict = true
    const user = userEvent.setup()
    renderApp('/app/ambassador/deals/new?campaign=82')
    await user.click(await screen.findByRole('button', { name: /^create deal$/i }))
    expect(await screen.findByText(/campaign state changed/i)).toBeInTheDocument()
  })

  it('renders deal snapshot, timeline, and cancellation', async () => {
    me = ambassador
    deals = [makeDeal()]
    evidenceByDeal[9001] = []
    const user = userEvent.setup()
    renderApp('/app/ambassador/deals/9001')
    expect(await screen.findByText(/deal snapshot/i)).toBeInTheDocument()
    expect(screen.getByText(/historical commercial terms/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/deal progress/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel this deal/i }))
    await user.type(screen.getByLabelText(/^reason$/i), 'Customer withdrew')
    await user.click(screen.getByRole('button', { name: /confirm cancellation/i }))
    expect(await screen.findByText(/deal cancelled/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^cancelled$/i).length).toBeGreaterThan(0)
  })

  it('submits payment evidence and keeps pending messaging', async () => {
    me = ambassador
    deals = [makeDeal()]
    evidenceByDeal[9001] = []
    const user = userEvent.setup()
    renderApp('/app/ambassador/deals/9001')
    await screen.findByRole('heading', { name: /^payment evidence$/i })
    await user.selectOptions(screen.getByLabelText(/evidence type/i), 'transaction_reference')
    await user.type(screen.getByLabelText(/reference number/i), 'TRX-100')
    await user.type(screen.getByLabelText(/^amount$/i), '250000')
    await user.click(screen.getByRole('button', { name: /submit payment evidence/i }))
    expect(await screen.findByText(/ref trx-100/i)).toBeInTheDocument()
    expect(screen.getByText(/waiting for business confirmation/i)).toBeInTheDocument()
  })

  it('shows rejected evidence without inventing a payment-rejected deal status', async () => {
    me = ambassador
    deals = [makeDeal()]
    evidenceByDeal[9001] = [
      {
        id: 1,
        deal_id: 9001,
        kind: 'receipt',
        status: 'rejected',
        reference_number: 'BAD-1',
        amount: '100',
        currency: 'NGN',
        paid_on: '2026-09-08',
        note: null,
        has_file: true,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
    ]
    renderApp('/app/ambassador/deals/9001')
    expect(await screen.findByText(/^rejected$/i)).toBeInTheDocument()
    expect(screen.getByText(/deal stays payment pending/i)).toBeInTheDocument()
    expect(screen.getAllByText(/payment pending/i).length).toBeGreaterThan(0)
  })

  it('shows commission due/paid/received actions', async () => {
    me = ambassador
    const dueDeal = makeDeal({
      id: 9100,
      status: 'sealed',
      confirmed_at: '2026-09-09T10:00:00+00:00',
      confirmed_payment_amount: '250000.00',
      commission: {
        id: 55,
        status: 'due',
        amount: '30000.00',
        currency: 'NGN',
        due_at: '2026-09-16T10:00:00+00:00',
        paid_at: null,
        received_at: null,
        is_overdue: false,
      },
    })
    deals = [dueDeal]
    evidenceByDeal[9100] = []
    renderApp('/app/ambassador/deals/9100')
    expect(await screen.findByText(/commission due/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument()

    deals = [
      makeDeal({
        id: 9101,
        status: 'sealed',
        commission: {
          id: 56,
          status: 'paid',
          amount: '30000.00',
          currency: 'NGN',
          due_at: '2026-09-16T10:00:00+00:00',
          paid_at: '2026-09-10T10:00:00+00:00',
          received_at: null,
          is_overdue: false,
        },
      }),
    ]
    evidenceByDeal[9101] = []
    cleanup()
    renderApp('/app/ambassador/deals/9101')
    const receive = await screen.findByRole('button', { name: /confirm commission received/i })
    await userEvent.setup().click(receive)
    await waitFor(() => {
      expect(deals[0]?.status).toBe('completed')
    })
  })

  it('renders public official payment page without auth', async () => {
    me = null
    const user = userEvent.setup()
    renderApp(`/pay/${campaignDetail.official_payment.token}`)
    expect(
      await screen.findByRole('heading', { name: /solar street light installation kit/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/pay the business directly/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/0123456789/)).toBeInTheDocument()
    expect(screen.queryByText(/paystack/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /copy payment link/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/link copied/i)
  })

  it('shows invalid payment token state', async () => {
    renderApp('/pay/not-a-real-token')
    expect(await screen.findByText(/payment information unavailable/i)).toBeInTheDocument()
  })

  it('blocks business users from ambassador deal routes', async () => {
    me = business
    renderApp('/app/ambassador/deals')
    await waitFor(() => {
      expect(window.location.pathname).not.toMatch(/\/app\/ambassador\/deals/)
    })
  })

  it('shows dispute indicator when backend reports open disputes', async () => {
    me = ambassador
    deals = [makeDeal({ has_open_dispute: true, open_dispute_count: 1 })]
    evidenceByDeal[9001] = []
    renderApp('/app/ambassador/deals/9001')
    expect(await screen.findByText(/dispute open/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open disputes area/i })).toHaveAttribute(
      'href',
      '/app/ambassador/disputes?deal=9001',
    )
  })

  it('does not render sensitive payment account fields on campaign detail', async () => {
    renderApp('/campaigns/82')
    await screen.findByRole('heading', { name: /demo solar street light kits/i })
    expect(screen.queryByText('0123456789')).not.toBeInTheDocument()
    expect(screen.queryByText(/storage/i)).not.toBeInTheDocument()
  })
})
