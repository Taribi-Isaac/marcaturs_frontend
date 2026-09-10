import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import { notificationDeepLink, notificationTitle } from './presentation'
import type { AppNotification } from './types'

const business = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS' as const,
  status: 'active' as const,
}

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR' as const,
  status: 'active' as const,
}

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n-1',
    type: 'commission_due',
    data: {
      commission_id: 91,
      deal_id: 7001,
      amount: '30000.00',
      currency: 'NGN',
      status: 'due',
      password: 'should-never-render',
      token: 'secret-token',
      payment_account_identifier: '0123456789',
    },
    is_read: false,
    read_at: null,
    created_at: '2026-09-09T12:00:00+00:00',
    ...overrides,
  }
}

let me: typeof business | typeof ambassador | null = null
let notifications: AppNotification[] = []
let listFailure = 0
let markReadFailure = 0

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
  http.get('/api/v1/notifications', ({ request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
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
    const items = notifications.slice(start, start + perPage)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: page,
          per_page: perPage,
          total: notifications.length,
          last_page: Math.max(1, Math.ceil(notifications.length / perPage) || 1),
          from: items.length ? start + 1 : null,
          to: items.length ? start + items.length : null,
        },
      },
    })
  }),
  http.get('/api/v1/notifications/:id', ({ params }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const item = notifications.find((n) => n.id === String(params.id))
    if (!item) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Notification not found.' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: item })
  }),
  http.post('/api/v1/notifications/:id/read', ({ params }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (markReadFailure) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: markReadFailure === 409 ? 'conflict' : 'server_error',
            message: markReadFailure === 409 ? 'Conflict.' : 'Could not mark read.',
          },
        },
        { status: markReadFailure },
      )
    }
    const index = notifications.findIndex((n) => n.id === String(params.id))
    if (index < 0) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Notification not found.' } },
        { status: 404 },
      )
    }
    const current = notifications[index]!
    const updated: AppNotification = {
      ...current,
      is_read: true,
      read_at: current.read_at || '2026-09-09T13:00:00+00:00',
    }
    notifications[index] = updated
    return HttpResponse.json({ success: true, data: updated })
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
  notifications = []
  listFailure = 0
  markReadFailure = 0
})
afterAll(() => server.close())

describe('MH-FE-P06 participant notifications UX', () => {
  beforeEach(() => {
    notifications = [
      makeNotification(),
      makeNotification({
        id: 'n-2',
        type: 'dispute_opened',
        data: { dispute_id: 501, deal_id: 7001, reference: 'MH-D-ABC12345', status: 'submitted' },
        is_read: false,
      }),
      makeNotification({
        id: 'n-3',
        type: 'deal_cancelled',
        data: { deal_id: 7002, status: 'cancelled' },
        is_read: true,
        read_at: '2026-09-08T12:00:00+00:00',
      }),
    ]
  })

  it('renders business notification list with unread/read states', async () => {
    me = business
    renderApp('/app/business/notifications')
    expect(await screen.findByRole('heading', { name: /^notifications$/i })).toBeInTheDocument()
    expect(await screen.findByText(/commission is due/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^unread$/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/^read$/i)).toBeInTheDocument()
    expect(screen.queryByText('should-never-render')).not.toBeInTheDocument()
    expect(screen.queryByText('secret-token')).not.toBeInTheDocument()
    expect(screen.queryByText('0123456789')).not.toBeInTheDocument()
  })

  it('marks a notification as read and links to business deal/dispute routes', async () => {
    me = business
    const user = userEvent.setup()
    renderApp('/app/business/notifications')
    await user.click(await screen.findByRole('button', { name: /commission is due/i }))
    await waitFor(() => {
      expect(notifications.find((n) => n.id === 'n-1')?.is_read).toBe(true)
    })
    expect(await screen.findByRole('link', { name: /^open deal$/i })).toHaveAttribute(
      'href',
      '/app/business/deals/7001',
    )

    cleanup()
    me = business
    renderApp('/app/business/notifications')
    await user.click(await screen.findByRole('button', { name: /dispute opened/i }))
    expect(await screen.findByRole('link', { name: /^open dispute$/i })).toHaveAttribute(
      'href',
      '/app/business/disputes/501',
    )
  })

  it('renders ambassador inbox and role-aware deep links', async () => {
    me = ambassador
    const user = userEvent.setup()
    renderApp('/app/ambassador/notifications')
    expect(await screen.findByRole('heading', { name: /^notifications$/i })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /commission is due/i }))
    expect(await screen.findByRole('link', { name: /^open deal$/i })).toHaveAttribute(
      'href',
      '/app/ambassador/deals/7001',
    )
    expect(screen.queryByRole('link', { name: /\/admin\//i })).not.toBeInTheDocument()
  })

  it('shows empty inbox copy', async () => {
    me = ambassador
    notifications = []
    renderApp('/app/ambassador/notifications')
    expect(await screen.findByText(/you're all caught up/i)).toBeInTheDocument()
  })

  it('handles list server errors and mark-read conflict', async () => {
    me = business
    listFailure = 500
    renderApp('/app/business/notifications')
    expect(await screen.findByText(/could not load notifications/i)).toBeInTheDocument()

    cleanup()
    me = business
    listFailure = 0
    markReadFailure = 409
    const user = userEvent.setup()
    renderApp('/app/business/notifications')
    await user.click(await screen.findByRole('button', { name: /commission is due/i }))
    expect(await screen.findByText(/conflict/i)).toBeInTheDocument()
  })

  it('handles unauthorized access and rate-limit style failures', async () => {
    me = ambassador
    renderApp('/app/business/notifications')
    await waitFor(() => {
      expect(window.location.pathname).not.toMatch(/\/app\/business\/notifications/)
    })

    cleanup()
    me = business
    listFailure = 429
    renderApp('/app/business/notifications')
    expect(await screen.findByText(/could not load notifications/i)).toBeInTheDocument()
  })

  it('builds role-aware deep links without inventing IDs', () => {
    expect(
      notificationDeepLink(
        makeNotification({
          type: 'dispute_resolved',
          data: { dispute_id: 88, deal_id: 12 },
        }),
        'AMBASSADOR',
      ),
    ).toEqual({ to: '/app/ambassador/disputes/88', label: 'Open dispute' })

    expect(
      notificationDeepLink(
        makeNotification({
          type: 'campaign_featured_purchased',
          data: { campaign_id: 82, package_name: 'Featured 7' },
        }),
        'BUSINESS',
      ),
    ).toEqual({ to: '/app/business/campaigns/82', label: 'Open campaign' })

    expect(
      notificationDeepLink(
        makeNotification({
          type: 'commission_paid',
          data: { commission_id: 9 },
        }),
        'AMBASSADOR',
      ),
    ).toEqual({ to: '/app/ambassador/earnings', label: 'Open earnings' })

    expect(
      notificationDeepLink(
        makeNotification({
          type: 'commission_overdue',
          data: { commission_id: 38 },
        }),
        'BUSINESS',
      ),
    ).toEqual({ to: '/app/business/deals', label: 'Open Deals' })

    expect(
      notificationDeepLink(
        makeNotification({
          type: 'test',
          data: { title: 'Hello' },
        }),
        'BUSINESS',
      ),
    ).toBeNull()

    expect(notificationTitle(makeNotification({ type: 'test', data: { title: 'Hello' } }))).toBe(
      'Hello',
    )
  })
})
