import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { Deal, PaymentEvidence } from '@/features/ambassador-deals/types'

const business = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS',
  status: 'active',
}

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR',
  status: 'active',
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 7001,
    status: 'payment_pending',
    business: { id: 1, name: 'Ada Solar', role: 'BUSINESS' },
    ambassador: { id: 2, name: 'Ada Ambassador', role: 'AMBASSADOR' },
    campaign: { id: 82, title: 'Demo Solar Street Light Kits', status: 'active' },
    campaign_version: { id: 820, version_number: 1 },
    product_name: 'Solar street light installation kit',
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
    qualifying_conditions: 'Customer pays in full.',
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

let me: typeof business | typeof ambassador | null = null
let deals: Deal[] = []
let evidenceByDeal: Record<number, PaymentEvidence[]> = {}
let commissions: Array<{
  id: number
  status: 'due' | 'paid' | 'received'
  deal_id: number
  amount: string
  currency: string
  due_at: string | null
  paid_at: string | null
  received_at: string | null
  is_overdue: boolean
}> = []
let confirmConflict = false
let confirmValidation = false

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
  http.post('/api/v1/auth/logout', () => {
    me = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/categories', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/marketplace/campaigns', () =>
    HttpResponse.json({
      success: true,
      data: [],
      meta: {
        pagination: {
          current_page: 1,
          per_page: 12,
          total: 0,
          last_page: 1,
          from: null,
          to: null,
        },
      },
    }),
  ),
  http.get('/api/v1/deals', () => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const items =
      me.role === 'BUSINESS'
        ? deals.filter((deal) => deal.business.id === me!.id)
        : deals.filter((deal) => deal.ambassador.id === me!.id)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: 1,
          per_page: 50,
          total: items.length,
          last_page: 1,
          from: items.length ? 1 : null,
          to: items.length || null,
        },
      },
    })
  }),
  http.get('/api/v1/deals/:id', ({ params }) => {
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal || !me || me.role !== 'BUSINESS' || deal.business.id !== me.id) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.get('/api/v1/deals/:id/payment-evidence', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({ success: true, data: evidenceByDeal[id] || [] })
  }),
  http.get(
    '/api/v1/deals/:id/payment-evidence/:eid/download',
    () =>
      new HttpResponse('file', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
  ),
  http.get('/api/v1/commissions', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json({ success: true, data: [] })
    }
    return HttpResponse.json({ success: true, data: commissions })
  }),
  http.post('/api/v1/deals/:id/confirm', async ({ params, request }) => {
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal || me?.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (confirmConflict) {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Deal state changed.' } },
        { status: 409 },
      )
    }
    const body = (await request.json()) as { confirmed_payment_amount?: string | number }
    const submitted = (evidenceByDeal[deal.id] || []).some((item) => item.status === 'submitted')
    if (!submitted) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message:
              'At least one submitted payment evidence record is required before confirmation.',
          },
        },
        { status: 422 },
      )
    }
    if (
      deal.commission_type === 'percentage' &&
      (confirmValidation || body.confirmed_payment_amount == null)
    ) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: {
              confirmed_payment_amount: [
                'The confirmed payment amount is required for percentage commission Deals.',
              ],
            },
          },
        },
        { status: 400 },
      )
    }
    if ('commission_amount' in body || 'status' in body || 'business_user_id' in body) {
      return HttpResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Protected fields.' } },
        { status: 400 },
      )
    }
    deal.status = 'sealed'
    deal.confirmed_at = '2026-09-09T12:00:00+00:00'
    deal.confirmed_payment_amount =
      body.confirmed_payment_amount != null ? String(body.confirmed_payment_amount) : null
    deal.commission = {
      id: 900,
      status: 'due',
      amount: '30000.00',
      currency: 'NGN',
      due_at: '2026-09-16T12:00:00+00:00',
      paid_at: null,
      received_at: null,
      is_overdue: false,
    }
    commissions = [
      {
        id: 900,
        status: 'due',
        deal_id: deal.id,
        amount: '30000.00',
        currency: 'NGN',
        due_at: '2026-09-16T12:00:00+00:00',
        paid_at: null,
        received_at: null,
        is_overdue: false,
      },
    ]
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.post('/api/v1/deals/:id/payment-evidence/:eid/reject', async ({ params, request }) => {
    const dealId = Number(params.id)
    const evidenceId = Number(params.eid)
    const body = (await request.json()) as { reason?: string }
    if (!body.reason || body.reason.trim().length < 3) {
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
    const list = evidenceByDeal[dealId] || []
    const item = list.find((row) => row.id === evidenceId)
    const deal = deals.find((row) => row.id === dealId)
    if (!item || !deal) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    item.status = 'rejected'
    deal.events = [
      ...(deal.events || []),
      {
        id: Date.now(),
        type: 'payment_rejected',
        actor: { id: 1, role: 'BUSINESS' },
        previous_status: 'payment_pending',
        new_status: 'payment_pending',
        metadata: { payment_evidence_id: evidenceId, reason: body.reason },
        created_at: '2026-09-09T12:30:00+00:00',
      },
    ]
    return HttpResponse.json({ success: true, data: item })
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
    if (!body.reason || body.reason.length < 3) {
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
    deal.cancelled_at = '2026-09-09T13:00:00+00:00'
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.post('/api/v1/commissions/:id/mark-paid', ({ params }) => {
    const commission = commissions.find((item) => item.id === Number(params.id))
    if (!commission || commission.status !== 'due') {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Not due.' } },
        { status: 409 },
      )
    }
    commission.status = 'paid'
    commission.paid_at = '2026-09-09T14:00:00+00:00'
    const deal = deals.find((item) => item.id === commission.deal_id)
    if (deal?.commission) {
      deal.commission.status = 'paid'
      deal.commission.paid_at = commission.paid_at
    }
    return HttpResponse.json({ success: true, data: commission })
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
  commissions = []
  confirmConflict = false
  confirmValidation = false
})
afterAll(() => server.close())

describe('MH-FE-P04 business deal operations', () => {
  beforeEach(() => {
    me = business
  })

  it('renders deal list with attention states and empty handling', async () => {
    deals = []
    renderApp('/app/business/deals')
    expect(await screen.findByRole('heading', { name: /^deals$/i })).toBeInTheDocument()
    expect(await screen.findByText(/no deals yet/i)).toBeInTheDocument()

    cleanup()
    deals = [
      makeDeal({ id: 1, has_open_dispute: true, open_dispute_count: 1 }),
      makeDeal({
        id: 2,
        status: 'sealed',
        commission: {
          id: 1,
          status: 'due',
          amount: '100',
          currency: 'NGN',
          due_at: null,
          paid_at: null,
          received_at: null,
          is_overdue: true,
        },
      }),
    ]
    commissions = [
      {
        id: 1,
        status: 'due',
        deal_id: 2,
        amount: '100',
        currency: 'NGN',
        due_at: null,
        paid_at: null,
        received_at: null,
        is_overdue: true,
      },
    ]
    renderApp('/app/business/deals')
    expect(await screen.findByText(/open dispute — review/i)).toBeInTheDocument()
    expect(screen.getByText(/commission overdue — pay ambassador/i)).toBeInTheDocument()
  })

  it('shows deal snapshot, ambassador, campaign, and evidence metadata', async () => {
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 11,
        deal_id: 7001,
        kind: 'transaction_reference',
        status: 'submitted',
        reference_number: 'DEMO-TXN-10001',
        amount: '250000.00',
        currency: 'NGN',
        paid_on: '2026-09-08',
        note: 'Paid to Ada Solar',
        has_file: true,
        original_filename: 'proof.pdf',
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
      {
        id: 10,
        deal_id: 7001,
        kind: 'receipt',
        status: 'rejected',
        reference_number: null,
        amount: null,
        currency: null,
        paid_on: null,
        note: null,
        has_file: true,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-07T12:00:00+00:00',
        created_at: '2026-09-07T12:00:00+00:00',
      },
    ]
    renderApp('/app/business/deals/7001')
    expect(await screen.findByText(/deal snapshot/i)).toBeInTheDocument()
    expect(screen.getByText(/historical commercial terms/i)).toBeInTheDocument()
    expect(screen.getByText(/ada ambassador/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open campaign/i })).toHaveAttribute(
      'href',
      '/app/business/campaigns/82',
    )
    expect(await screen.findByText(/DEMO-TXN-10001/)).toBeInTheDocument()
    expect(screen.getAllByText(/^rejected$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /download evidence/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /confirm customer payment/i })).toBeInTheDocument()
  })

  it('confirms percentage deals with amount dialog and refreshes sealed state', async () => {
    const user = userEvent.setup()
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 11,
        deal_id: 7001,
        kind: 'transaction_reference',
        status: 'submitted',
        reference_number: 'REF-1',
        amount: '250000',
        currency: 'NGN',
        paid_on: null,
        note: null,
        has_file: false,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
    ]
    renderApp('/app/business/deals/7001')
    await user.click(await screen.findByRole('button', { name: /confirm customer payment/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/confirmed payment amount/i), '250000')
    await user.click(screen.getByRole('button', { name: /seal deal & create commission/i }))
    expect(await screen.findAllByText(/commission owed to ambassador/i)).not.toHaveLength(0)
    expect(screen.getAllByText(/payment confirmed/i).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /confirm customer payment/i }),
    ).not.toBeInTheDocument()
  })

  it('handles confirmation 409 and 422/400 validation', async () => {
    const user = userEvent.setup()
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 11,
        deal_id: 7001,
        kind: 'transaction_reference',
        status: 'submitted',
        reference_number: 'REF-1',
        amount: null,
        currency: null,
        paid_on: null,
        note: null,
        has_file: false,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
    ]
    confirmValidation = true
    renderApp('/app/business/deals/7001')
    await user.click(await screen.findByRole('button', { name: /confirm customer payment/i }))
    await user.click(screen.getByRole('button', { name: /seal deal & create commission/i }))
    expect(await screen.findByText(/confirmed payment amount is required/i)).toBeInTheDocument()

    cleanup()
    confirmValidation = false
    confirmConflict = true
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 11,
        deal_id: 7001,
        kind: 'transaction_reference',
        status: 'submitted',
        reference_number: 'REF-1',
        amount: null,
        currency: null,
        paid_on: null,
        note: null,
        has_file: false,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
    ]
    renderApp('/app/business/deals/7001')
    await user.click(await screen.findByRole('button', { name: /confirm customer payment/i }))
    await user.type(screen.getByLabelText(/confirmed payment amount/i), '100')
    await user.click(screen.getByRole('button', { name: /seal deal & create commission/i }))
    expect(await screen.findByText(/deal state changed/i)).toBeInTheDocument()
  })

  it('rejects evidence with reason and keeps deal pending', async () => {
    const user = userEvent.setup()
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 11,
        deal_id: 7001,
        kind: 'transaction_reference',
        status: 'submitted',
        reference_number: 'REF-1',
        amount: null,
        currency: null,
        paid_on: null,
        note: null,
        has_file: false,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-08T12:00:00+00:00',
        created_at: '2026-09-08T12:00:00+00:00',
      },
    ]
    renderApp('/app/business/deals/7001')
    await user.click(await screen.findByRole('button', { name: /reject this claim/i }))
    await user.type(screen.getByLabelText(/rejection reason/i), 'Amount does not match')
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))
    expect(await screen.findByText(/deal remains payment pending/i)).toBeInTheDocument()
    expect(screen.getAllByText(/payment pending/i).length).toBeGreaterThan(0)
    expect(deals[0]?.status).toBe('payment_pending')
  })

  it('cancels pending deals only and hides cancel when sealed', async () => {
    const user = userEvent.setup()
    deals = [makeDeal()]
    evidenceByDeal[7001] = []
    renderApp('/app/business/deals/7001')
    await user.click(await screen.findByRole('button', { name: /cancel this deal/i }))
    await user.type(screen.getByLabelText(/^reason$/i), 'Customer withdrew')
    await user.click(screen.getByRole('button', { name: /confirm cancellation/i }))
    expect(await screen.findByText(/deal cancelled/i)).toBeInTheDocument()

    cleanup()
    deals = [
      makeDeal({
        id: 8000,
        status: 'sealed',
        confirmed_at: '2026-09-09T12:00:00+00:00',
        commission: {
          id: 1,
          status: 'due',
          amount: '100',
          currency: 'NGN',
          due_at: null,
          paid_at: null,
          received_at: null,
          is_overdue: false,
        },
      }),
    ]
    evidenceByDeal[8000] = []
    renderApp('/app/business/deals/8000')
    expect(await screen.findAllByText(/commission owed to ambassador/i)).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: /cancel this deal/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /confirm customer payment/i }),
    ).not.toBeInTheDocument()
  })

  it('shows dispute indicator and blocks ambassadors from business deals', async () => {
    deals = [makeDeal({ has_open_dispute: true, open_dispute_count: 2 })]
    evidenceByDeal[7001] = []
    renderApp('/app/business/deals/7001')
    expect(await screen.findByText(/dispute open \(2\)/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open disputes area/i })).toHaveAttribute(
      'href',
      '/app/business/disputes',
    )

    cleanup()
    me = ambassador
    renderApp('/app/business/deals')
    await waitFor(() => {
      expect(window.location.pathname).not.toMatch(/\/app\/business\/deals/)
    })
  })

  it('hides confirm when no submitted evidence', async () => {
    deals = [makeDeal()]
    evidenceByDeal[7001] = [
      {
        id: 10,
        deal_id: 7001,
        kind: 'receipt',
        status: 'rejected',
        reference_number: null,
        amount: null,
        currency: null,
        paid_on: null,
        note: null,
        has_file: false,
        submitted_by: { id: 2, role: 'AMBASSADOR' },
        submitted_at: '2026-09-07T12:00:00+00:00',
        created_at: '2026-09-07T12:00:00+00:00',
      },
    ]
    renderApp('/app/business/deals/7001')
    expect(await screen.findByText(/waiting for ambassador/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /confirm customer payment/i }),
    ).not.toBeInTheDocument()
  })
})
