import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { MarketplaceCampaignCard } from '@/features/marketplace/types'

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

function campaignCard(id: number, title: string): MarketplaceCampaignCard {
  return {
    id,
    title,
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
    is_featured: false,
    cover_image: null,
    listing_starts_at: null,
    listing_expires_at: null,
  }
}

const detailExtras = {
  commission_trigger_description: 'After business confirms customer payment',
  commission_payment_deadline_days: 7,
  minimum_qualifying_amount: null,
  qualifying_conditions: 'Customer pays in full.',
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
  marketing_resources: [],
}

type BookmarkRecord = {
  bookmarked_at: string
  discoverable: boolean
  campaign: MarketplaceCampaignCard | { id: number; title: string; status: string }
}

let me: typeof ambassador | typeof business | null = null
let bookmarks: BookmarkRecord[] = []
let saveFailure: 'none' | '401' | '403' | '404' | 'network' | 'unexpected' = 'none'
let listFailure = false
const bookmarkCalls: Array<{ method: string; pathname: string; search: string }> = []

function listResponse(request: Request) {
  const url = new URL(request.url)
  bookmarkCalls.push({ method: request.method, pathname: url.pathname, search: url.search })
  if (listFailure) {
    return HttpResponse.json(
      { success: false, error: { code: 'server_error', message: 'Server error.' } },
      { status: 500 },
    )
  }
  const page = Number(url.searchParams.get('page') || '1')
  const perPage = Number(url.searchParams.get('per_page') || '15')
  const start = (page - 1) * perPage
  const items = bookmarks.slice(start, start + perPage)
  const lastPage = Math.max(1, Math.ceil(bookmarks.length / perPage))
  return HttpResponse.json({
    success: true,
    data: items,
    meta: {
      pagination: {
        current_page: page,
        per_page: perPage,
        total: bookmarks.length,
        last_page: lastPage,
        from: items.length ? start + 1 : null,
        to: items.length ? start + items.length : null,
      },
    },
  })
}

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
  http.get('/api/v1/marketplace/campaigns/:id', ({ params }) => {
    const id = Number(params.id)
    const saved = bookmarks.find((item) => item.campaign.id === id && item.discoverable)
    const card = saved?.campaign ?? campaignCard(id, 'Demo Solar Street Light Kits')
    if (id !== 82 && !saved) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: { ...card, ...detailExtras } })
  }),
  http.get('/api/v1/ambassadors/campaign-bookmarks', ({ request }) => listResponse(request)),
  http.put('/api/v1/marketplace/campaigns/:id/bookmark', ({ params, request }) => {
    const url = new URL(request.url)
    bookmarkCalls.push({ method: request.method, pathname: url.pathname, search: url.search })
    const id = Number(params.id)
    if (saveFailure === 'network') return HttpResponse.error()
    if (saveFailure === '401') {
      me = null
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (saveFailure === '403') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'forbidden', message: 'You are not authorized to perform this action.' },
        },
        { status: 403 },
      )
    }
    if (saveFailure === '404') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'not_found', message: 'The requested resource was not found.' },
        },
        { status: 404 },
      )
    }
    if (saveFailure === 'unexpected') {
      return HttpResponse.json({ ok: true })
    }
    if (!bookmarks.some((item) => item.campaign.id === id)) {
      bookmarks = [
        {
          bookmarked_at: '2026-10-21T12:00:00+00:00',
          discoverable: true,
          campaign: campaignCard(id, 'Demo Solar Street Light Kits'),
        },
        ...bookmarks,
      ]
    }
    return HttpResponse.json({
      success: true,
      data: { campaign_id: id, bookmarked_at: '2026-10-21T12:00:00+00:00' },
    })
  }),
  http.delete('/api/v1/marketplace/campaigns/:id/bookmark', ({ params, request }) => {
    const url = new URL(request.url)
    bookmarkCalls.push({ method: request.method, pathname: url.pathname, search: url.search })
    bookmarks = bookmarks.filter((item) => item.campaign.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
)

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = null
  bookmarks = []
  saveFailure = 'none'
  listFailure = false
  bookmarkCalls.length = 0
})
afterAll(() => server.close())

it('shows save only to an authenticated ambassador', async () => {
  renderApp('/campaigns/82')
  expect(
    await screen.findByRole('heading', { name: /demo solar street light kits/i }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save campaign' })).not.toBeInTheDocument()

  cleanup()
  me = business
  renderApp('/campaigns/82')
  expect(await screen.findByText(/signed in as a business/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save campaign' })).not.toBeInTheDocument()

  cleanup()
  me = ambassador
  renderApp('/campaigns/82')
  const save = await screen.findByRole('button', { name: 'Save campaign' })
  await waitFor(() => expect(save).toBeEnabled())
  expect(save).toHaveAttribute('aria-pressed', 'false')
})

it('shows the saved state and removes it from campaign details', async () => {
  me = ambassador
  bookmarks = [
    {
      bookmarked_at: '2026-10-21T12:00:00+00:00',
      discoverable: true,
      campaign: campaignCard(82, 'Demo Solar Street Light Kits'),
    },
  ]
  const user = userEvent.setup()
  renderApp('/campaigns/82')

  expect(await screen.findByText('Saved')).toBeInTheDocument()
  const remove = screen.getByRole('button', { name: /remove demo solar street light kits/i })
  expect(remove).toHaveAttribute('aria-pressed', 'true')
  await user.click(remove)

  expect(await screen.findByRole('status')).toHaveTextContent('Removed from saved campaigns.')
  expect(await screen.findByRole('button', { name: 'Save campaign' })).toBeInTheDocument()
  expect(bookmarkCalls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'DELETE',
        pathname: '/api/v1/marketplace/campaigns/82/bookmark',
      }),
    ]),
  )
})

it('saves a campaign with PUT and ignores repeated clicks while pending', async () => {
  me = ambassador
  let release: (() => void) | undefined
  server.use(
    http.put('/api/v1/marketplace/campaigns/:id/bookmark', ({ request }) => {
      const url = new URL(request.url)
      bookmarkCalls.push({ method: request.method, pathname: url.pathname, search: url.search })
      return new Promise((resolve) => {
        release = () => {
          bookmarks = [
            {
              bookmarked_at: '2026-10-21T12:00:00+00:00',
              discoverable: true,
              campaign: campaignCard(82, 'Demo Solar Street Light Kits'),
            },
          ]
          resolve(
            HttpResponse.json({
              success: true,
              data: { campaign_id: 82, bookmarked_at: '2026-10-21T12:00:00+00:00' },
            }),
          )
        }
      })
    }),
  )
  const user = userEvent.setup()
  renderApp('/campaigns/82')
  const save = await screen.findByRole('button', { name: 'Save campaign' })
  await waitFor(() => expect(save).toBeEnabled())
  await user.click(save)
  const pending = await screen.findByRole('button', { name: 'Saving…' })
  expect(pending).toBeDisabled()
  expect(bookmarkCalls.filter((call) => call.method === 'PUT')).toHaveLength(1)
  release?.()
  expect(await screen.findByRole('status')).toHaveTextContent('Campaign saved.')
  expect(await screen.findByText('Saved')).toBeInTheDocument()
  expect(bookmarkCalls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'PUT',
        pathname: '/api/v1/marketplace/campaigns/82/bookmark',
      }),
    ]),
  )
})

async function saveCampaign(user: ReturnType<typeof userEvent.setup>) {
  const save = await screen.findByRole('button', { name: 'Save campaign' })
  await waitFor(() => expect(save).toBeEnabled())
  await user.click(save)
}

it('reports save failures from the API', async () => {
  me = ambassador
  const user = userEvent.setup()

  saveFailure = '404'
  renderApp('/campaigns/82')
  await saveCampaign(user)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This campaign can no longer be saved.',
  )

  cleanup()
  bookmarkCalls.length = 0
  saveFailure = '403'
  renderApp('/campaigns/82')
  await saveCampaign(user)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'You are not authorized to perform this action.',
  )

  cleanup()
  bookmarkCalls.length = 0
  saveFailure = 'network'
  renderApp('/campaigns/82')
  await saveCampaign(user)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to reach the MarcatursHub API.',
  )

  cleanup()
  bookmarkCalls.length = 0
  saveFailure = 'unexpected'
  renderApp('/campaigns/82')
  await saveCampaign(user)
  expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected API response shape.')

  cleanup()
  bookmarkCalls.length = 0
  saveFailure = '401'
  renderApp('/campaigns/82')
  await saveCampaign(user)
  expect(await screen.findByRole('link', { name: /sign in to create a deal/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save campaign' })).not.toBeInTheDocument()
  expect(bookmarkCalls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'PUT',
        pathname: '/api/v1/marketplace/campaigns/82/bookmark',
      }),
    ]),
  )
})

it('shows loading and failure while checking the saved state', async () => {
  me = ambassador
  let release: (() => void) | undefined
  server.use(
    http.get('/api/v1/ambassadors/campaign-bookmarks', () => {
      return new Promise((resolve) => {
        release = () =>
          resolve(
            HttpResponse.json({
              success: true,
              data: [],
              meta: {
                pagination: {
                  current_page: 1,
                  per_page: 100,
                  total: 0,
                  last_page: 1,
                  from: null,
                  to: null,
                },
              },
            }),
          )
      })
    }),
  )
  renderApp('/campaigns/82')
  expect(await screen.findByRole('button', { name: 'Save campaign' })).toBeDisabled()
  release?.()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save campaign' })).toBeEnabled())

  cleanup()
  server.use(
    http.get('/api/v1/ambassadors/campaign-bookmarks', () =>
      HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Server error.' } },
        { status: 500 },
      ),
    ),
  )
  renderApp('/campaigns/82')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not check whether this campaign is saved.',
  )
  expect(screen.queryByRole('button', { name: 'Save campaign' })).not.toBeInTheDocument()
})

it('lists saved campaigns newest first and paginates', async () => {
  me = ambassador
  bookmarks = [
    {
      bookmarked_at: '2026-10-21T12:00:00+00:00',
      discoverable: true,
      campaign: campaignCard(2, 'Newest Offer'),
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      bookmarked_at: '2026-10-20T12:00:00+00:00',
      discoverable: true as const,
      campaign: campaignCard(index + 10, `Older Offer ${index + 1}`),
    })),
  ]
  const user = userEvent.setup()
  renderApp('/app/ambassador/saved')

  const nav = await screen.findByRole('complementary', { name: 'Ambassador navigation' })
  const labels = within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent)
  expect(labels.indexOf('Saved')).toBe(labels.indexOf('Discover') + 1)

  expect(await screen.findByRole('link', { name: /newest offer/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /older offer 12/i })).not.toBeInTheDocument()
  const body = document.body.textContent ?? ''
  expect(body.indexOf('Newest Offer')).toBeLessThan(body.indexOf('Older Offer 1'))

  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByRole('link', { name: /older offer 12/i })).toBeInTheDocument()
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
  expect(bookmarkCalls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'GET',
        pathname: '/api/v1/ambassadors/campaign-bookmarks',
        search: expect.stringContaining('page=2'),
      }),
    ]),
  )
  expect(bookmarkCalls.some((call) => call.search.includes('per_page=12'))).toBe(true)
})

it('shows an empty saved list and a list failure', async () => {
  me = ambassador
  renderApp('/app/ambassador/saved')
  expect(
    await screen.findByRole('heading', { name: 'You have not saved any campaigns.' }),
  ).toBeInTheDocument()

  cleanup()
  listFailure = true
  renderApp('/app/ambassador/saved')
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load saved campaigns')
})

it('keeps remove outside the campaign link and presents unavailable bookmarks safely', async () => {
  me = ambassador
  bookmarks = [
    {
      bookmarked_at: '2026-10-21T13:00:00+00:00',
      discoverable: true,
      campaign: campaignCard(82, 'Demo Solar Street Light Kits'),
    },
    {
      bookmarked_at: '2026-10-21T12:00:00+00:00',
      discoverable: false,
      campaign: {
        id: 9,
        title: 'Retired Kit',
        status: 'expired',
        product_description: 'SECRET-ACCOUNT-999',
      } as BookmarkRecord['campaign'],
    },
  ]
  const user = userEvent.setup()
  renderApp('/app/ambassador/saved')

  const card = await screen.findByRole('link', { name: /demo solar street light kits/i })
  const removeCard = screen.getByRole('button', { name: /remove demo solar street light kits/i })
  expect(card.contains(removeCard)).toBe(false)
  expect(removeCard.closest('a')).toBeNull()
  expect(card).toHaveAttribute('href', '/campaigns/82')

  expect(screen.getByRole('heading', { name: 'Retired Kit' })).toBeInTheDocument()
  expect(screen.getByText('No longer available.')).toBeInTheDocument()
  expect(screen.getByText('Status: expired')).toBeInTheDocument()
  expect(screen.queryByText('SECRET-ACCOUNT-999')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /retired kit/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /create deal/i })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /remove retired kit/i }))
  expect(await screen.findByRole('status')).toHaveTextContent('Removed from saved campaigns.')
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'Retired Kit' })).not.toBeInTheDocument()
  })
  expect(bookmarkCalls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'DELETE',
        pathname: '/api/v1/marketplace/campaigns/9/bookmark',
      }),
    ]),
  )
})

it('shows a loading state for the saved list', async () => {
  me = ambassador
  let release: (() => void) | undefined
  server.use(
    http.get('/api/v1/ambassadors/campaign-bookmarks', () => {
      return new Promise((resolve) => {
        release = () =>
          resolve(
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
          )
      })
    }),
  )
  renderApp('/app/ambassador/saved')
  expect(await screen.findByText('Loading saved campaigns…')).toBeInTheDocument()
  release?.()
  expect(
    await screen.findByRole('heading', { name: 'You have not saved any campaigns.' }),
  ).toBeInTheDocument()
})
