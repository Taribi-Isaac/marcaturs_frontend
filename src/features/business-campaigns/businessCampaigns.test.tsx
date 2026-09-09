import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { BusinessCampaign, CampaignVersion, CategorySummary } from './types'

const categories: CategorySummary[] = [
  {
    id: 10,
    name: 'Solar & Energy',
    slug: 'solar',
    listing_status: 'allowed',
    sort_order: 1,
  },
]

let campaigns: BusinessCampaign[] = []
let versionsByCampaign: Record<number, CampaignVersion[]> = {}
let nextCampaignId = 100
let me: null | {
  id: number
  name: string
  email: string
  role: string
  status: string
} = null

function draftCampaign(overrides: Partial<BusinessCampaign> = {}): BusinessCampaign {
  return {
    id: nextCampaignId++,
    title: 'New Solar Kits',
    status: 'draft',
    category: categories[0],
    current_version: null,
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
    created_at: '2026-09-01T00:00:00+00:00',
    updated_at: '2026-09-01T00:00:00+00:00',
    ...overrides,
  }
}

function draftVersion(campaignId: number, n = 1): CampaignVersion {
  return {
    id: campaignId * 10 + n,
    campaign_id: campaignId,
    version_number: n,
    status: 'draft',
    product_name: 'Solar kit',
    product_description: 'Desc',
    pricing_method: 'fixed',
    price_amount: '1000',
    price_currency: 'NGN',
    service_area: 'Lagos',
    commission_type: 'percentage',
    commission_rate: '10',
    commission_amount: null,
    commission_trigger: 'payment_confirmation',
    commission_trigger_description: null,
    commission_payment_deadline_days: 7,
    minimum_qualifying_amount: null,
    qualifying_conditions: 'Paid in full',
    refund_cancellation_rules: 'No refunds after install',
    approved_claims: null,
    prohibited_claims: null,
    brand_use_rules: null,
    geographic_customer_restrictions: null,
    approved_copy: null,
    marketing_links: [],
    payment_destination_name: 'Ada Solar',
    payment_provider: 'Bank',
    payment_account_identifier: '1234567890',
    payment_instructions: 'Pay to account',
    payment_contact: null,
    terms: 'Standard terms',
    published_at: null,
    created_at: '2026-09-01T00:00:00+00:00',
    updated_at: '2026-09-01T00:00:00+00:00',
  }
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
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    if (body.email.startsWith('business')) {
      me = {
        id: 1,
        name: 'Ada Solar',
        email: body.email,
        role: 'BUSINESS',
        status: 'active',
      }
      return HttpResponse.json({ success: true, data: me })
    }
    if (body.email.startsWith('admin')) {
      me = {
        id: 9,
        name: 'Admin',
        email: body.email,
        role: 'ADMIN',
        status: 'active',
      }
      return HttpResponse.json({ success: true, data: me })
    }
    return HttpResponse.json(
      { success: false, error: { code: 'unauthenticated', message: 'Invalid.' } },
      { status: 401 },
    )
  }),
  http.post('/api/v1/auth/logout', () => {
    me = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/categories', () => HttpResponse.json({ success: true, data: categories })),
  http.get('/api/v1/campaigns', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden' } },
        { status: 403 },
      )
    }
    return HttpResponse.json({ success: true, data: campaigns })
  }),
  http.post('/api/v1/campaigns', async ({ request }) => {
    const body = (await request.json()) as { title?: string; category_id?: number }
    if (!body.title || !body.category_id) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details: {
              title: body.title ? undefined : ['Title is required.'],
              category_id: body.category_id ? undefined : ['Category is required.'],
            },
          },
        },
        { status: 400 },
      )
    }
    const created = draftCampaign({
      title: body.title,
      category: categories.find((c) => c.id === body.category_id) ?? categories[0],
    })
    campaigns = [created, ...campaigns]
    versionsByCampaign[created.id] = []
    return HttpResponse.json({ success: true, data: created }, { status: 201 })
  }),
  http.get('/api/v1/campaigns/:id', ({ params }) => {
    const campaign = campaigns.find((c) => c.id === Number(params.id))
    if (!campaign) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: campaign })
  }),
  http.patch('/api/v1/campaigns/:id', async ({ params, request }) => {
    const campaign = campaigns.find((c) => c.id === Number(params.id))
    if (!campaign) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (campaign.status !== 'draft') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'Only draft campaigns can be updated.' },
        },
        { status: 409 },
      )
    }
    const body = (await request.json()) as { title?: string; category_id?: number }
    campaign.title = body.title ?? campaign.title
    if (body.category_id) {
      campaign.category = categories.find((c) => c.id === body.category_id) ?? campaign.category
    }
    return HttpResponse.json({ success: true, data: campaign })
  }),
  http.get('/api/v1/campaigns/:id/versions', ({ params }) => {
    const list = versionsByCampaign[Number(params.id)] ?? []
    return HttpResponse.json({ success: true, data: list })
  }),
  http.post('/api/v1/campaigns/:id/versions', ({ params }) => {
    const campaignId = Number(params.id)
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (!campaign) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    const existing = versionsByCampaign[campaignId] ?? []
    if (existing.some((v) => v.status === 'draft')) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'A draft version already exists.' },
        },
        { status: 409 },
      )
    }
    const version = draftVersion(campaignId, existing.length + 1)
    versionsByCampaign[campaignId] = [...existing, version]
    return HttpResponse.json({ success: true, data: version }, { status: 201 })
  }),
  http.patch('/api/v1/campaigns/:id/versions/:version', async ({ params, request }) => {
    const campaignId = Number(params.id)
    const versionNumber = Number(params.version)
    const list = versionsByCampaign[campaignId] ?? []
    const version = list.find((v) => v.version_number === versionNumber)
    if (!version) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (version.status !== 'draft') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'Published versions are immutable.' },
        },
        { status: 409 },
      )
    }
    const body = (await request.json()) as Partial<CampaignVersion>
    Object.assign(version, body)
    return HttpResponse.json({ success: true, data: version })
  }),
  http.post('/api/v1/campaigns/:id/versions/:version/publish', ({ params }) => {
    const campaignId = Number(params.id)
    const versionNumber = Number(params.version)
    const campaign = campaigns.find((c) => c.id === campaignId)
    const list = versionsByCampaign[campaignId] ?? []
    const version = list.find((v) => v.version_number === versionNumber)
    if (!campaign || !version) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (!version.payment_destination_name) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message: 'Payment destination is required to publish.',
          },
        },
        { status: 422 },
      )
    }
    version.status = 'published'
    version.published_at = '2026-09-02T00:00:00+00:00'
    campaign.current_version = {
      id: version.id,
      version_number: version.version_number,
      status: 'published',
    }
    return HttpResponse.json({ success: true, data: version })
  }),
  http.post('/api/v1/campaigns/:id/submit', ({ params }) => {
    const campaign = campaigns.find((c) => c.id === Number(params.id))
    if (!campaign) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    if (campaign.status !== 'draft') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'Campaign state changed.' },
        },
        { status: 409 },
      )
    }
    if (!campaign.current_version) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'business_validation',
            message: 'Publish a commercial version before submitting.',
          },
        },
        { status: 422 },
      )
    }
    campaign.status = 'submitted'
    campaign.submitted_at = '2026-09-03T00:00:00+00:00'
    return HttpResponse.json({ success: true, data: campaign })
  }),
  http.get('/api/v1/campaigns/:id/resources', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/campaigns/:id/featured', () =>
    HttpResponse.json({
      success: true,
      data: { is_featured: false, expires_at: null, purchases: [] },
    }),
  ),
  http.get('/api/v1/campaigns/:id/extension-packages', () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get('/api/v1/campaign-featured/packages', () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get('/api/v1/marketplace/campaigns', () =>
    HttpResponse.json({ success: true, data: [], meta: { pagination: { total: 0 } } }),
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

async function loginAsBusiness() {
  me = {
    id: 1,
    name: 'Ada Solar',
    email: 'business.solar@demo.marcaturshub.test',
    role: 'BUSINESS',
    status: 'active',
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  me = null
  campaigns = []
  versionsByCampaign = {}
  nextCampaignId = 100
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Business campaigns desk', () => {
  beforeEach(async () => {
    await loginAsBusiness()
  })

  it('shows empty state when the business has no campaigns', async () => {
    renderApp('/app/business/campaigns')
    expect(await screen.findByRole('heading', { name: 'Campaigns' })).toBeInTheDocument()
    expect(await screen.findByText(/Create your first campaign/i)).toBeInTheDocument()
  })

  it('renders campaign list with status badges', async () => {
    campaigns = [
      draftCampaign({ id: 1, title: 'Active Solar', status: 'active' }),
      draftCampaign({ id: 2, title: 'Draft Offer', status: 'draft' }),
    ]
    nextCampaignId = 3
    renderApp('/app/business/campaigns')
    expect(await screen.findByText('Active Solar')).toBeInTheDocument()
    expect(screen.getByText('Draft Offer')).toBeInTheDocument()
    const badges = screen.getAllByText(/^(Active|Draft)$/)
    expect(badges.some((el) => el.className.includes('badge'))).toBe(true)
  })

  it('validates create form and creates a campaign', async () => {
    const user = userEvent.setup()
    renderApp('/app/business/campaigns/new')
    expect(await screen.findByRole('heading', { name: 'Create campaign' })).toBeInTheDocument()
    const submit = await screen.findByRole('button', { name: /Create draft/i })
    await user.click(submit)
    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Campaign title/i), 'Lagos Solar Push')
    await user.selectOptions(screen.getByLabelText(/Category/i), '10')
    await user.click(screen.getByRole('button', { name: /Create draft/i }))

    expect(await screen.findByRole('heading', { name: 'Lagos Solar Push' })).toBeInTheDocument()
    expect(campaigns).toHaveLength(1)
  })

  it('surfaces server validation errors on create', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/v1/campaigns', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'validation_error',
              message: 'The given data was invalid.',
              details: { title: ['Title already used.'] },
            },
          },
          { status: 400 },
        ),
      ),
    )
    renderApp('/app/business/campaigns/new')
    await screen.findByRole('button', { name: /Create draft/i })
    await user.type(screen.getByLabelText(/Campaign title/i), 'Dup')
    await user.selectOptions(screen.getByLabelText(/Category/i), '10')
    await user.click(screen.getByRole('button', { name: /Create draft/i }))
    expect(await screen.findByText('Title already used.')).toBeInTheDocument()
  })

  it('shows detail, creates and publishes a version, then submits', async () => {
    const user = userEvent.setup()
    const campaign = draftCampaign({ id: 55, title: 'Submit Me' })
    campaigns = [campaign]
    versionsByCampaign[55] = []
    window.confirm = () => true

    renderApp('/app/business/campaigns/55')
    expect(await screen.findByRole('heading', { name: 'Submit Me' })).toBeInTheDocument()
    expect(screen.getByText(/still being prepared/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Commercial version/i }))
    await user.click(await screen.findByRole('button', { name: /Create draft version/i }))
    expect(await screen.findByText(/Version 1/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Publish version/i }))
    await waitFor(() => {
      expect(versionsByCampaign[55]?.[0]?.status).toBe('published')
    })
    expect(await screen.findByText(/Commercial version published/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Overview/i }))
    await user.click(screen.getByRole('button', { name: /Submit for review/i }))
    await waitFor(() => {
      expect(campaigns[0]?.status).toBe('submitted')
    })
    expect(await screen.findByText(/waiting for MarcatursHub review/i)).toBeInTheDocument()
  })

  it('shows published version as read-only', async () => {
    const campaign = draftCampaign({
      id: 70,
      title: 'Published Terms',
      current_version: { id: 701, version_number: 1, status: 'published' },
    })
    const version = draftVersion(70, 1)
    version.status = 'published'
    version.published_at = '2026-09-02T00:00:00+00:00'
    campaigns = [campaign]
    versionsByCampaign[70] = [version]

    renderApp('/app/business/campaigns/70')
    await screen.findByRole('heading', { name: 'Published Terms' })
    await userEvent.click(screen.getByRole('tab', { name: /Commercial version/i }))
    expect(await screen.findByText(/published and immutable/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save draft/i })).not.toBeInTheDocument()
  })

  it('handles not-found campaign detail', async () => {
    renderApp('/app/business/campaigns/999')
    expect(await screen.findByText(/Campaign not found/i)).toBeInTheDocument()
  })

  it('blocks unauthenticated access to the campaigns desk', async () => {
    me = null
    renderApp('/app/business/campaigns')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('blocks admin from the business campaigns desk', async () => {
    me = {
      id: 9,
      name: 'Admin',
      email: 'admin@demo.marcaturshub.test',
      role: 'ADMIN',
      status: 'active',
    }
    renderApp('/app/business/campaigns')
    expect(
      await screen.findByText(/Admin accounts|not available|Forbidden|do not have/i),
    ).toBeInTheDocument()
  })
})
