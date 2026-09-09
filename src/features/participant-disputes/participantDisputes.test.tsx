import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { Deal } from '@/features/ambassador-deals/types'
import type { Dispute } from './types'

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
    status: 'completed',
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
    commission_amount: '30000.00',
    commission_trigger: 'payment_confirmation',
    commission_trigger_description: 'After business confirms customer payment',
    commission_payment_deadline_days: 7,
    minimum_qualifying_amount: null,
    qualifying_conditions: 'Customer pays in full.',
    expected_transaction_amount: '250000.00',
    confirmed_payment_amount: '250000.00',
    confirmed_at: '2026-09-08T12:00:00+00:00',
    cancelled_at: null,
    has_open_dispute: true,
    open_dispute_count: 1,
    commission: {
      id: 91,
      status: 'received',
      amount: '30000.00',
      currency: 'NGN',
      due_at: '2026-09-12T12:00:00+00:00',
      paid_at: '2026-09-10T12:00:00+00:00',
      received_at: '2026-09-11T12:00:00+00:00',
      is_overdue: false,
    },
    events: [],
    created_at: '2026-09-08T10:00:00+00:00',
    updated_at: '2026-09-11T12:00:00+00:00',
    ...overrides,
  }
}

function makeDispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: 501,
    reference: 'MH-D-ABC12345',
    status: 'under_review',
    deal_id: 7001,
    commission_id: 91,
    category: { id: 1, code: 'unpaid_commission', name: 'Unpaid commission' },
    reporter: { id: 2, role: 'AMBASSADOR' },
    accused: { id: 1, role: 'BUSINESS' },
    description: 'The commission was not paid on time and needs review.',
    decision_notes: null,
    action_notes: null,
    resolved_at: null,
    closed_at: null,
    attachments: [],
    events: [
      {
        id: 1,
        type: 'dispute_created',
        previous_status: null,
        new_status: 'submitted',
        actor: { id: 2, role: 'AMBASSADOR' },
        metadata: { deal_id: 7001 },
        created_at: '2026-09-10T12:00:00+00:00',
      },
    ],
    created_at: '2026-09-10T12:00:00+00:00',
    updated_at: '2026-09-11T12:00:00+00:00',
    ...overrides,
  }
}

let me: typeof business | typeof ambassador | null = null
let deals: Deal[] = []
let disputes: Dispute[] = []
const categories = [
  {
    id: 1,
    code: 'unpaid_commission',
    name: 'Unpaid commission',
    description: '',
    is_active: true,
    sort_order: 1,
  },
  { id: 2, code: 'other', name: 'Other', description: '', is_active: true, sort_order: 2 },
]
let nextDisputeId = 600
let listFailure = 0
let createConflict = false
let attachmentFailure = 0

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
  http.get('/api/v1/dispute-categories', () => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    return HttpResponse.json({ success: true, data: categories })
  }),
  http.get('/api/v1/disputes', ({ request }) => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    if (listFailure) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Server error.' } },
        { status: listFailure },
      )
    }
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = 20
    const start = (page - 1) * perPage
    const items = disputes.slice(start, start + perPage)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: page,
          per_page: perPage,
          total: disputes.length,
          last_page: Math.max(1, Math.ceil(disputes.length / perPage)),
          from: items.length ? start + 1 : null,
          to: items.length ? start + items.length : null,
        },
      },
    })
  }),
  http.get('/api/v1/disputes/:id', ({ params }) => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    const dispute = disputes.find((item) => item.id === Number(params.id))
    if (!dispute) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: dispute })
  }),
  http.get('/api/v1/deals', () => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    const currentUser = me
    const items =
      currentUser.role === 'BUSINESS'
        ? deals.filter((d) => d.business.id === currentUser.id)
        : deals.filter((d) => d.ambassador.id === currentUser.id)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: 1,
          per_page: 100,
          total: items.length,
          last_page: 1,
          from: items.length ? 1 : null,
          to: items.length || null,
        },
      },
    })
  }),
  http.get('/api/v1/deals/:id/payment-evidence', () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get('/api/v1/deals/:id', ({ params }) => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: deal })
  }),
  http.post('/api/v1/deals/:id/disputes', async ({ params, request }) => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    const dealId = Number(params.id)
    const deal = deals.find((item) => item.id === dealId)
    if (!deal) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (createConflict) {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Dispute state changed.' } },
        { status: 409 },
      )
    }
    const body = (await request.json()) as { category_id?: number; description?: string }
    if (!body.category_id || !body.description || body.description.length < 10) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: {
              category_id: !body.category_id ? ['Choose a category.'] : undefined,
              description:
                !body.description || body.description.length < 10
                  ? ['Description must be at least 10 characters.']
                  : undefined,
            },
          },
        },
        { status: 400 },
      )
    }
    const currentUser = me
    if (!currentUser) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const dispute = makeDispute({
      id: nextDisputeId++,
      deal_id: dealId,
      status: 'submitted',
      category: categories.find((item) => item.id === body.category_id) || null,
      description: body.description,
      reporter:
        currentUser.role === 'BUSINESS'
          ? { id: 1, role: 'BUSINESS' }
          : { id: 2, role: 'AMBASSADOR' },
      accused:
        currentUser.role === 'BUSINESS'
          ? { id: 2, role: 'AMBASSADOR' }
          : { id: 1, role: 'BUSINESS' },
      events: [
        {
          id: Date.now(),
          type: 'dispute_created',
          previous_status: null,
          new_status: 'submitted',
          actor: { id: currentUser.id, role: currentUser.role },
          metadata: { deal_id: dealId },
          created_at: '2026-09-12T12:00:00+00:00',
        },
      ],
    })
    disputes = [dispute, ...disputes]
    const index = deals.findIndex((item) => item.id === dealId)
    if (index >= 0) {
      const existingDeal = deals[index]!
      deals[index] = {
        ...existingDeal,
        has_open_dispute: true,
        open_dispute_count: existingDeal.open_dispute_count + 1,
      }
    }
    return HttpResponse.json({ success: true, data: dispute }, { status: 201 })
  }),
  http.post('/api/v1/disputes/:id/attachments', ({ params }) => {
    if (!me)
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    if (attachmentFailure) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: attachmentFailure === 429 ? 'rate_limited' : 'server_error',
            message: 'Upload failed.',
          },
        },
        { status: attachmentFailure },
      )
    }
    const dispute = disputes.find((item) => item.id === Number(params.id))
    if (!dispute)
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    const note = 'Requested evidence pack'
    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message: 'Attachments cannot be uploaded in the current Dispute state.',
          },
        },
        { status: 422 },
      )
    }
    dispute.attachments = [
      ...(dispute.attachments || []),
      {
        id: Date.now(),
        uploader: { id: me.id, role: me.role },
        original_filename: 'proof.pdf',
        mime_type: 'application/pdf',
        size_bytes: 5,
        note,
        has_file: true,
        created_at: '2026-09-12T13:00:00+00:00',
      },
    ]
    return HttpResponse.json(
      { success: true, data: dispute.attachments[dispute.attachments.length - 1] },
      { status: 201 },
    )
  }),
  http.get(
    '/api/v1/disputes/:id/attachments/:attachmentId/download',
    () => new HttpResponse('file', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
  ),
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
  disputes = []
  nextDisputeId = 600
  listFailure = 0
  createConflict = false
  attachmentFailure = 0
})
afterAll(() => server.close())

describe('MH-FE-P05 participant disputes UX', () => {
  beforeEach(() => {
    deals = [
      makeDeal(),
      makeDeal({
        id: 7002,
        status: 'payment_pending',
        open_dispute_count: 0,
        has_open_dispute: false,
        commission: null,
        confirmed_at: null,
        confirmed_payment_amount: null,
      }),
    ]
    disputes = [
      makeDispute(),
      makeDispute({ id: 502, reference: 'MH-D-XYZ98765', status: 'evidence_requested' }),
      makeDispute({
        id: 503,
        reference: 'MH-D-RESOLVED1',
        status: 'resolved',
        decision_notes: 'Decision note',
        action_notes: 'Action note',
      }),
      makeDispute({
        id: 504,
        reference: 'MH-D-CLOSED01',
        status: 'closed',
        decision_notes: 'Decision note',
        action_notes: 'Action note',
        closed_at: '2026-09-12T12:00:00+00:00',
      }),
      makeDispute({ id: 505, reference: 'MH-D-SUBMIT01', status: 'submitted' }),
      makeDispute({ id: 506, reference: 'MH-D-PEND001', status: 'decision_pending' }),
    ]
  })

  it('renders business dispute list and create form', async () => {
    me = business
    renderApp('/app/business/disputes?deal=7002')
    expect(await screen.findByRole('heading', { name: /^disputes$/i })).toBeInTheDocument()
    expect(
      await screen.findByText(/opening a dispute creates a review case concerning this deal/i),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('7002')).toBeInTheDocument()
    expect((await screen.findAllByText(/deal #7001/i)).length).toBeGreaterThan(0)
    expect((await screen.findAllByText(/evidence requested/i)).length).toBeGreaterThan(0)
  })

  it('creates a dispute from business side and navigates to detail', async () => {
    me = business
    const user = userEvent.setup()
    renderApp('/app/business/disputes?deal=7002')
    await user.selectOptions(await screen.findByLabelText(/category/i), '1')
    await user.type(
      screen.getByLabelText(/what happened/i),
      'Ambassador raised a commercial issue that needs review.',
    )
    await user.click(screen.getByRole('button', { name: /open dispute/i }))
    await waitFor(() => expect(window.location.pathname).toBe('/app/business/disputes/600'))
    expect(await screen.findByRole('heading', { level: 1, name: /mh-d-/i })).toBeInTheDocument()
  }, 10000)

  it('shows create validation and conflict errors', async () => {
    me = ambassador
    const user = userEvent.setup()
    renderApp('/app/ambassador/disputes?deal=7002')
    await user.click(await screen.findByRole('button', { name: /open dispute/i }))
    expect(await screen.findByText(/choose a dispute category/i)).toBeInTheDocument()

    cleanup()
    me = ambassador
    createConflict = true
    renderApp('/app/ambassador/disputes?deal=7002')
    await user.selectOptions(await screen.findByLabelText(/category/i), '2')
    await user.type(
      screen.getByLabelText(/what happened/i),
      'A commercial issue needs review from the dispute team.',
    )
    await user.click(screen.getByRole('button', { name: /open dispute/i }))
    expect(await screen.findByText(/dispute state changed/i)).toBeInTheDocument()
  })

  it('renders dispute detail with completed deal still completed', async () => {
    me = ambassador
    renderApp('/app/ambassador/disputes/501')
    expect(await screen.findByRole('heading', { name: /mh-d-abc12345/i })).toBeInTheDocument()
    expect(screen.getAllByText(/under review/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /open deal/i })).toHaveAttribute(
      'href',
      '/app/ambassador/deals/7001',
    )
    expect((await screen.findAllByText(/completed/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/^disputed$/i)).not.toBeInTheDocument()
  })

  it('shows resolved and closed participant-visible notes only when exposed', async () => {
    me = business
    renderApp('/app/business/disputes/503')
    expect(await screen.findByRole('heading', { name: /resolution notes/i })).toBeInTheDocument()
    expect(screen.getByText(/decision note/i)).toBeInTheDocument()
    expect(screen.getByText(/action note/i)).toBeInTheDocument()

    cleanup()
    me = business
    renderApp('/app/business/disputes/504')
    expect(await screen.findAllByText(/closed/i)).not.toHaveLength(0)
  })

  it('uploads participant attachments when state allows and blocks terminal state upload', async () => {
    me = ambassador
    const user = userEvent.setup()
    renderApp('/app/ambassador/disputes/502')
    const file = new File(['proof'], 'proof.pdf', { type: 'application/pdf' })
    await user.upload(await screen.findByLabelText(/^file$/i), file)
    await user.type(screen.getByLabelText(/^note$/i), 'Requested evidence pack')
    await user.click(screen.getByRole('button', { name: /upload attachment/i }))
    expect(await screen.findByRole('link', { name: /download attachment/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download attachment/i })).toBeInTheDocument()

    cleanup()
    me = ambassador
    renderApp('/app/ambassador/disputes/504')
    expect(
      await screen.findByText(/participant attachment upload is not available/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload attachment/i })).not.toBeInTheDocument()
  })

  it('handles attachment upload rate limit errors', async () => {
    me = ambassador
    attachmentFailure = 429
    const user = userEvent.setup()
    renderApp('/app/ambassador/disputes/502')
    const file = new File(['proof'], 'proof.pdf', { type: 'application/pdf' })
    await user.upload(await screen.findByLabelText(/^file$/i), file)
    await user.click(screen.getByRole('button', { name: /upload attachment/i }))
    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument()
  })

  it('handles list server errors and detail 404', async () => {
    me = business
    listFailure = 500
    renderApp('/app/business/disputes')
    expect(await screen.findByText(/could not load disputes/i)).toBeInTheDocument()

    cleanup()
    me = business
    renderApp('/app/business/disputes/9999')
    expect(await screen.findByText(/dispute not found/i)).toBeInTheDocument()
  })

  it('redirects unauthorized users away from participant dispute routes', async () => {
    me = ambassador
    renderApp('/app/business/disputes')
    await waitFor(() => {
      expect(window.location.pathname).not.toMatch(/\/app\/business\/disputes/)
    })
  })

  it('integrates from deal pages into disputes area for both roles', async () => {
    me = business
    renderApp('/app/business/deals/7001')
    expect(await screen.findByRole('link', { name: /open disputes area/i })).toHaveAttribute(
      'href',
      '/app/business/disputes?deal=7001',
    )

    cleanup()
    me = ambassador
    renderApp('/app/ambassador/deals/7001')
    expect(await screen.findByRole('link', { name: /open disputes area/i })).toHaveAttribute(
      'href',
      '/app/ambassador/disputes?deal=7001',
    )
  })
})
