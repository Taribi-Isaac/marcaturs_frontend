import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { Deal } from '@/features/ambassador-deals/types'
import { notificationDeepLink } from '@/features/participant-notifications/presentation'
import {
  commissionStatusLabel,
  matchesCommissionFilter,
  overdueDurationLabel,
  summarizeCommissions,
} from './format'

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

const admin = {
  id: 9,
  name: 'Admin',
  email: 'admin.primary@demo.marcaturshub.test',
  role: 'ADMIN',
  status: 'active',
}

type CommissionFixture = {
  id: number
  status: 'due' | 'paid' | 'received'
  deal_id: number
  amount: string
  currency: string
  due_at: string | null
  paid_at: string | null
  received_at: string | null
  is_overdue: boolean
  payment_reference?: string | null
  payment_note?: string | null
  became_due_at?: string | null
  campaign_version_id?: number
  commission_type?: string
  commission_rate?: string
  ambassador?: { id: number; role: string }
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 55,
    status: 'sealed',
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
    confirmed_payment_amount: '250000.00',
    confirmed_at: '2026-09-01T12:00:00+00:00',
    cancelled_at: null,
    has_open_dispute: false,
    open_dispute_count: 0,
    commission: null,
    events: [],
    created_at: '2026-09-01T10:00:00+00:00',
    updated_at: '2026-09-01T12:00:00+00:00',
    ...overrides,
  }
}

let me: typeof business | typeof ambassador | typeof admin | null = null
let commissions: CommissionFixture[] = []
let deals: Deal[] = []
let markPaidConflict = false

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (!me)
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'unauthenticated', message: 'Authentication is required.' },
        },
        { status: 401 },
      )
    return HttpResponse.json({ success: true, data: me })
  }),
  http.get('/api/v1/commissions', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({ success: true, data: commissions })
  }),
  http.get('/api/v1/commissions/:id', ({ params }) => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    const commission = commissions.find((item) => item.id === Number(params.id))
    if (!commission) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: commission })
  }),
  http.post('/api/v1/commissions/:id/mark-paid', async ({ params, request }) => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    if (markPaidConflict) {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Commission is not due.' } },
        { status: 409 },
      )
    }
    const commission = commissions.find((item) => item.id === Number(params.id))
    if (!commission || commission.status !== 'due') {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Commission is not due.' } },
        { status: 409 },
      )
    }
    const body = (await request.json()) as { payment_reference?: string; payment_note?: string }
    if ('amount' in body) {
      return HttpResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Invalid.' } },
        { status: 422 },
      )
    }
    commission.status = 'paid'
    commission.paid_at = '2026-09-10T12:00:00+00:00'
    commission.is_overdue = false
    commission.payment_reference = body.payment_reference ?? null
    commission.payment_note = body.payment_note ?? null
    return HttpResponse.json({ success: true, data: commission })
  }),
  http.get('/api/v1/deals', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({ success: true, data: deals })
  }),
  http.get('/api/v1/deals/:id', ({ params }) => {
    const deal = deals.find((item) => item.id === Number(params.id))
    if (!deal) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: deal })
  }),
)

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  const client = createQueryClient()
  return render(
    <AppProviders queryClient={client}>
      <AppRouter />
    </AppProviders>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = null
  commissions = []
  deals = []
  markPaidConflict = false
})
afterAll(() => server.close())

describe('business commissions helpers', () => {
  it('labels overdue duration and filters honestly', () => {
    expect(
      overdueDurationLabel('2026-09-07T12:00:00+00:00', new Date('2026-09-10T12:00:00+00:00')),
    ).toBe('Overdue by 3 days')
    const items = [
      {
        id: 1,
        status: 'due' as const,
        deal_id: 1,
        amount: '10',
        currency: 'NGN',
        due_at: null,
        paid_at: null,
        received_at: null,
        is_overdue: true,
      },
      {
        id: 2,
        status: 'paid' as const,
        deal_id: 2,
        amount: '20',
        currency: 'NGN',
        due_at: null,
        paid_at: null,
        received_at: null,
        is_overdue: false,
      },
    ]
    expect(matchesCommissionFilter(items[0]!, 'overdue')).toBe(true)
    expect(matchesCommissionFilter(items[1]!, 'awaiting_receipt')).toBe(true)
    expect(commissionStatusLabel(items[1]!)).toMatch(/awaiting receipt/i)
    expect(summarizeCommissions(items).overdueCount).toBe(1)
  })

  it('deep-links Business commission notifications to the commissions desk', () => {
    expect(
      notificationDeepLink(
        {
          id: 'n1',
          type: 'commission_due',
          data: { commission_id: 41, deal_id: 55 },
          is_read: false,
          read_at: null,
          created_at: '2026-09-10T10:00:00+00:00',
        },
        'BUSINESS',
      ),
    ).toEqual({ to: '/app/business/commissions/41', label: 'Open commission' })
  })
})

describe('MH-FE-P12 Business commissions desk', () => {
  beforeEach(() => {
    me = business
    deals = [
      makeDeal({ id: 55, has_open_dispute: true, open_dispute_count: 1 }),
      makeDeal({
        id: 57,
        ambassador: { id: 3, name: 'Funke Adeyemi', role: 'AMBASSADOR' },
        product_name: 'Completed kit',
      }),
    ]
    commissions = [
      {
        id: 38,
        status: 'due',
        deal_id: 55,
        amount: '30000.00',
        currency: 'NGN',
        due_at: '2026-08-25T12:00:00+00:00',
        paid_at: null,
        received_at: null,
        is_overdue: true,
        became_due_at: '2026-08-18T12:00:00+00:00',
        campaign_version_id: 820,
        commission_type: 'percentage',
        commission_rate: '12.00',
        ambassador: { id: 2, role: 'AMBASSADOR' },
      },
      {
        id: 41,
        status: 'due',
        deal_id: 55,
        amount: '12000.00',
        currency: 'NGN',
        due_at: '2026-09-20T12:00:00+00:00',
        paid_at: null,
        received_at: null,
        is_overdue: false,
        became_due_at: '2026-09-13T12:00:00+00:00',
        campaign_version_id: 820,
        commission_type: 'percentage',
        commission_rate: '12.00',
        ambassador: { id: 2, role: 'AMBASSADOR' },
      },
      {
        id: 42,
        status: 'paid',
        deal_id: 57,
        amount: '15000.00',
        currency: 'NGN',
        due_at: '2026-09-01T12:00:00+00:00',
        paid_at: '2026-09-02T12:00:00+00:00',
        received_at: null,
        is_overdue: false,
        payment_reference: 'TRX-1',
        ambassador: { id: 3, role: 'AMBASSADOR' },
      },
      {
        id: 43,
        status: 'received',
        deal_id: 57,
        amount: '9000.00',
        currency: 'NGN',
        due_at: '2026-08-01T12:00:00+00:00',
        paid_at: '2026-08-02T12:00:00+00:00',
        received_at: '2026-08-03T12:00:00+00:00',
        is_overdue: false,
        ambassador: { id: 3, role: 'AMBASSADOR' },
      },
    ]
  })

  it('renders commission list with summary, overdue text, and Deal enrichment', async () => {
    renderApp('/app/business/commissions')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Commissions' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/business → ambassador obligations/i)).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: /commission obligation summary/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/30,000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ada Ambassador/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/open dispute on deal/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/overdue by/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/paid — awaiting receipt/i).length).toBeGreaterThan(0)
  })

  it('filters client-side without inventing unsupported API params', async () => {
    const user = userEvent.setup()
    renderApp('/app/business/commissions')
    await screen.findByRole('region', { name: /commission obligation summary/i })
    await user.click(screen.getByRole('button', { name: 'Overdue' }))
    expect(screen.getByText(/commission #38/i)).toBeInTheDocument()
    expect(screen.queryByText(/commission #42/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Awaiting receipt' }))
    expect(screen.getByText(/commission #42/i)).toBeInTheDocument()
  })

  it('opens detail, links to Deal, and records payment with refresh', async () => {
    const user = userEvent.setup()
    renderApp('/app/business/commissions/38')
    expect(
      await screen.findByRole('heading', { level: 1, name: /commission #38/i }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /open deal/i })).toHaveAttribute(
      'href',
      '/app/business/deals/55',
    )
    expect(await screen.findByText(/Ada Ambassador/i)).toBeInTheDocument()
    expect(
      screen.getByText(/sealed Deal snapshot|Deal snapshot|live Campaign/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record commission paid/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/payment reference/i), 'BANK-9988')
    await user.type(screen.getByLabelText(/^note/i), 'Paid via transfer')
    await user.click(screen.getByRole('button', { name: /record commission paid/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /record payment/i }))
    await waitFor(() => {
      expect(screen.getByText(/paid — awaiting ambassador confirmation/i)).toBeInTheDocument()
    })
    expect(commissions.find((item) => item.id === 38)?.status).toBe('paid')
    expect(commissions.find((item) => item.id === 38)?.payment_reference).toBe('BANK-9988')
  })

  it('hides payment action when commission is already paid', async () => {
    renderApp('/app/business/commissions/42')
    expect(
      await screen.findByRole('heading', { level: 1, name: /commission #42/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /record commission paid/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/awaiting ambassador confirmation/i)).toBeInTheDocument()
  })

  it('handles mark-paid conflict', async () => {
    const user = userEvent.setup()
    markPaidConflict = true
    renderApp('/app/business/commissions/41')
    await screen.findByRole('heading', { level: 1, name: /commission #41/i })
    await user.click(screen.getByRole('button', { name: /record commission paid/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /record payment/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not due/i)
  })

  it('blocks unauthenticated and ambassador access', async () => {
    me = null
    renderApp('/app/business/commissions')
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()

    me = ambassador
    renderApp('/app/business/commissions')
    await waitFor(() => {
      expect(window.location.pathname).not.toBe('/app/business/commissions')
    })
  })

  it('blocks admin from the business commissions desk', async () => {
    me = admin
    renderApp('/app/business/commissions')
    expect(
      await screen.findByRole('heading', { name: /this app is for marketplace participants/i }),
    ).toBeInTheDocument()
  })

  it('shows empty state when there are no commissions', async () => {
    commissions = []
    renderApp('/app/business/commissions')
    expect(await screen.findByText(/no commissions yet/i)).toBeInTheDocument()
  })
})
