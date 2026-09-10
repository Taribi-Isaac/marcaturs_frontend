import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { Deal } from '@/features/ambassador-deals/types'
import type { BusinessCampaign } from '@/features/business-campaigns/types'
import type { Dispute } from '@/features/participant-disputes/types'
import type { AppNotification } from '@/features/participant-notifications/types'
import {
  buildAttentionItems,
  isDealRequiringBusinessAction,
  isImportantUnreadNotification,
  isOpenDisputeStatus,
} from './attention'

const business = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS' as const,
  status: 'active' as 'active' | 'restricted' | 'suspended' | 'banned',
}

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR' as const,
  status: 'active' as 'active' | 'restricted' | 'suspended' | 'banned',
}

const admin = {
  id: 9,
  name: 'Admin',
  email: 'admin.primary@demo.marcaturshub.test',
  role: 'ADMIN' as const,
  status: 'active' as 'active' | 'restricted' | 'suspended' | 'banned',
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 55,
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
    created_at: '2026-09-01T10:00:00+00:00',
    updated_at: '2026-09-01T12:00:00+00:00',
    ...overrides,
  }
}

function makeCampaign(overrides: Partial<BusinessCampaign> = {}): BusinessCampaign {
  return {
    id: 10,
    title: 'Draft Solar Kits',
    status: 'draft',
    listing_starts_at: null,
    listing_expires_at: null,
    submitted_at: null,
    approved_at: null,
    activated_at: null,
    deactivated_at: null,
    expired_at: null,
    closed_at: null,
    suspended_at: null,
    review_reason: null,
    created_at: '2026-09-01T10:00:00+00:00',
    updated_at: '2026-09-01T10:00:00+00:00',
    ...overrides,
  }
}

function makeDispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: 7,
    reference: 'DSP-7',
    status: 'submitted',
    deal_id: 55,
    commission_id: null,
    category: { id: 1, code: 'payment', name: 'Payment' },
    reporter: { id: 2, role: 'AMBASSADOR' },
    accused: { id: 1, role: 'BUSINESS' },
    description: 'Payment dispute',
    decision_notes: null,
    action_notes: null,
    resolved_at: null,
    closed_at: null,
    created_at: '2026-09-02T10:00:00+00:00',
    updated_at: '2026-09-02T10:00:00+00:00',
    ...overrides,
  }
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
}

let me: typeof business | typeof ambassador | typeof admin | null = null
let campaigns: BusinessCampaign[] = []
let deals: Deal[] = []
let commissions: CommissionFixture[] = []
let disputes: Dispute[] = []
let notifications: AppNotification[] = []
let failNotifications = false
let failCommissions = false
let verificationStatus = 'VERIFIED'

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (!me) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'unauthenticated', message: 'Authentication is required.' },
        },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: me })
  }),
  http.get('/api/v1/campaigns', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({ success: true, data: campaigns })
  }),
  http.get('/api/v1/deals', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: deals,
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 50, total: deals.length } },
    })
  }),
  http.get('/api/v1/commissions', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    if (failCommissions) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Unavailable' } },
        { status: 500 },
      )
    }
    return HttpResponse.json({ success: true, data: commissions })
  }),
  http.get('/api/v1/disputes', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: disputes,
      meta: { pagination: { current_page: 1, last_page: 1, per_page: 15, total: disputes.length } },
    })
  }),
  http.get('/api/v1/notifications', () => {
    if (!me || (me.role !== 'BUSINESS' && me.role !== 'AMBASSADOR')) {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    if (failNotifications) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Unavailable' } },
        { status: 500 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: notifications,
      meta: {
        pagination: { current_page: 1, last_page: 1, per_page: 20, total: notifications.length },
      },
    })
  }),
  http.get('/api/v1/verification/status', () => {
    if (!me || (me.role !== 'BUSINESS' && me.role !== 'AMBASSADOR')) {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: { overall_status: verificationStatus, requirements: [] },
    })
  }),
)

function renderApp(path = '/app/business') {
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
  campaigns = []
  deals = []
  commissions = []
  disputes = []
  notifications = []
  failNotifications = false
  failCommissions = false
  verificationStatus = 'VERIFIED'
})
afterAll(() => server.close())

describe('business dashboard attention logic', () => {
  it('ranks overdue commission before open dispute, deal, due commission, campaign, notification', () => {
    const ranked = buildAttentionItems({
      commissions: [
        {
          id: 2,
          status: 'due',
          deal_id: 55,
          amount: '100',
          currency: 'NGN',
          due_at: '2026-09-01',
          paid_at: null,
          received_at: null,
          is_overdue: false,
        },
        {
          id: 1,
          status: 'due',
          deal_id: 56,
          amount: '200',
          currency: 'NGN',
          due_at: '2026-08-01',
          paid_at: null,
          received_at: null,
          is_overdue: true,
        },
      ],
      deals: [makeDeal({ id: 55, status: 'payment_pending' })],
      disputes: [makeDispute({ id: 7, status: 'under_review' })],
      campaigns: [makeCampaign({ id: 10, status: 'draft' })],
      notifications: [
        {
          id: 'n1',
          type: 'commission_overdue',
          data: {},
          is_read: false,
          read_at: null,
          created_at: '2026-09-03T10:00:00+00:00',
        },
      ],
    })

    expect(ranked.map((item) => item.kind)).toEqual([
      'overdue_commission',
      'open_dispute',
      'deal_action',
      'due_commission',
      'campaign_action',
      'unread_notification',
    ])
  })

  it('does not invent unread or deal action outside certified states', () => {
    expect(
      isImportantUnreadNotification({
        id: 'x',
        type: 'commission_due',
        data: {},
        is_read: true,
        read_at: '2026-09-01',
        created_at: null,
      }),
    ).toBe(false)
    expect(isDealRequiringBusinessAction(makeDeal({ status: 'sealed' }))).toBe(false)
    expect(isOpenDisputeStatus('resolved')).toBe(false)
  })
})

describe('BusinessDashboardPage', () => {
  beforeEach(() => {
    me = { ...business }
  })

  it('renders dashboard from multiple APIs with attention and navigation links', async () => {
    campaigns = [
      makeCampaign({ id: 1, status: 'active', title: 'Live Solar' }),
      makeCampaign({ id: 2, status: 'draft', title: 'Draft Solar Kits' }),
    ]
    deals = [makeDeal({ id: 55, status: 'payment_pending' })]
    commissions = [
      {
        id: 11,
        status: 'due',
        deal_id: 55,
        amount: '30000.00',
        currency: 'NGN',
        due_at: '2026-08-01T00:00:00+00:00',
        paid_at: null,
        received_at: null,
        is_overdue: true,
      },
    ]
    disputes = [makeDispute({ id: 7, status: 'evidence_requested' })]
    notifications = [
      {
        id: 'note-1',
        type: 'dispute_opened',
        data: { title: 'Dispute opened on Deal' },
        is_read: false,
        read_at: null,
        created_at: '2026-09-03T10:00:00+00:00',
      },
    ]

    renderApp()

    expect(await screen.findByRole('heading', { name: /welcome back, ada/i })).toBeInTheDocument()
    expect(await screen.findByText(/overdue commission/i)).toBeInTheDocument()

    const attention = screen
      .getByRole('heading', { name: /what needs your attention/i })
      .closest('section')
    expect(attention).toBeTruthy()
    expect(within(attention as HTMLElement).getByText(/overdue commission/i)).toBeInTheDocument()
    expect(
      within(attention as HTMLElement).getByRole('link', { name: /review commission/i }),
    ).toHaveAttribute('href', '/app/business/commissions/11')
    expect(
      within(attention as HTMLElement).getByRole('link', { name: /view dispute/i }),
    ).toHaveAttribute('href', '/app/business/disputes/7')
    expect(
      within(attention as HTMLElement).getByRole('link', { name: /review deal/i }),
    ).toHaveAttribute('href', '/app/business/deals/55')
    expect(
      within(attention as HTMLElement).getByRole('link', { name: /open campaign/i }),
    ).toHaveAttribute('href', '/app/business/campaigns/2')

    expect(screen.getByRole('link', { name: /view campaigns/i })).toHaveAttribute(
      'href',
      '/app/business/campaigns',
    )
    expect(screen.getByRole('link', { name: /view all deals/i })).toHaveAttribute(
      'href',
      '/app/business/deals',
    )
    expect(screen.getByRole('link', { name: /view commissions/i })).toHaveAttribute(
      'href',
      '/app/business/commissions',
    )
    expect(screen.getByRole('link', { name: /^view notifications$/i })).toHaveAttribute(
      'href',
      '/app/business/notifications',
    )
    expect(screen.getByRole('link', { name: /^messages$/i })).toHaveAttribute(
      'href',
      '/app/business/messages',
    )
  })

  it('shows empty new-business guidance', async () => {
    renderApp()
    expect(
      await screen.findByRole('heading', { name: /start with your first campaign/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /create campaign/i }).length).toBeGreaterThan(0)
  })

  it('keeps dashboard usable when notifications fail', async () => {
    failNotifications = true
    campaigns = [makeCampaign({ id: 1, status: 'active', title: 'Live Solar' })]
    deals = [makeDeal({ id: 55 })]
    renderApp()

    expect(await screen.findByRole('heading', { name: /welcome back, ada/i })).toBeInTheDocument()
    expect(await screen.findByText(/notification information unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent deals/i })).toBeInTheDocument()
  })

  it('shows commission section error without destroying deals', async () => {
    failCommissions = true
    deals = [makeDeal({ id: 55 })]
    campaigns = [makeCampaign({ id: 1, status: 'active' })]
    renderApp()

    expect(await screen.findByText(/commission information unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent deals/i })).toBeInTheDocument()
    expect(screen.getAllByText(/solar street light installation kit/i).length).toBeGreaterThan(0)
  })

  it('redirects unauthenticated users to login', async () => {
    me = null
    renderApp()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
  })

  it('redirects ambassadors away from business dashboard', async () => {
    me = { ...ambassador }
    renderApp()
    await waitFor(() => {
      expect(window.location.pathname).not.toBe('/app/business')
    })
  })

  it('redirects admins to forbidden', async () => {
    me = { ...admin }
    renderApp()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/forbidden')
    })
  })

  it('shows restricted banner for restricted business accounts', async () => {
    me = { ...business, status: 'restricted' }
    campaigns = [makeCampaign({ id: 1, status: 'active' })]
    renderApp()
    expect(await screen.findByText(/account is restricted/i)).toBeInTheDocument()
  })

  it('blocks suspended accounts', async () => {
    me = { ...business, status: 'suspended' }
    renderApp()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/account-blocked')
    })
  })

  it('shows verification prompt when not verified', async () => {
    verificationStatus = 'NOT_STARTED'
    campaigns = [makeCampaign({ id: 1, status: 'active' })]
    renderApp()
    expect(
      await screen.findByRole('heading', {
        name: /complete verification to unlock the next step/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open verification/i })).toHaveAttribute(
      'href',
      '/app/business/verification',
    )
  })
})
