import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** Mirrors CampaignVersionService::assertPublishable and Laravel's default required message. */
function publishValidationDetails(version: CampaignVersion): Record<string, string[]> {
  const required: (keyof CampaignVersion)[] = [
    'product_name',
    'pricing_method',
    'commission_type',
    'commission_trigger',
    'commission_payment_deadline_days',
    'refund_cancellation_rules',
    'payment_destination_name',
    'payment_provider',
    'payment_account_identifier',
    'payment_instructions',
  ]
  if (version.pricing_method === 'fixed') required.push('price_amount')
  if (version.commission_type === 'percentage') required.push('commission_rate')
  if (version.commission_type === 'fixed') required.push('commission_amount')
  if (version.commission_trigger === 'other') required.push('commission_trigger_description')
  const details: Record<string, string[]> = {}
  for (const key of required) {
    const value = version[key]
    if (value === null || value === undefined || value === '') {
      details[key] = [`The ${key.replace(/_/g, ' ')} field is required.`]
    }
  }
  const deadline = version.commission_payment_deadline_days
  if (deadline != null && (deadline < 1 || deadline > 7)) {
    details.commission_payment_deadline_days = [
      deadline < 1
        ? 'The commission payment deadline days field must be at least 1.'
        : 'The commission payment deadline days field must not be greater than 7.',
    ]
  }
  return details
}

let versionPatches: Partial<CampaignVersion>[] = []
let publishCalls = 0

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
    versionPatches.push(body)
    Object.assign(version, body)
    return HttpResponse.json({ success: true, data: version })
  }),
  http.post('/api/v1/campaigns/:id/versions/:version/publish', ({ params }) => {
    publishCalls += 1
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
    const details = publishValidationDetails(version)
    if (Object.keys(details).length > 0) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The given data was invalid.',
            details,
          },
        },
        { status: 400 },
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
  http.post('/api/v1/campaigns/:id/cover', async ({ params }) => {
    const id = Number(params.id)
    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    const existed = Boolean(campaign.cover_image?.available)
    campaign.cover_image = {
      available: true,
      url: `http://localhost/api/v1/campaigns/${id}/cover/download`,
      mime_type: 'image/jpeg',
      size_bytes: 1024,
      original_filename: 'cover.jpg',
    }
    return HttpResponse.json(
      { success: true, data: campaign.cover_image },
      { status: existed ? 200 : 201 },
    )
  }),
  http.delete('/api/v1/campaigns/:id/cover', ({ params }) => {
    const id = Number(params.id)
    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign?.cover_image?.available) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found' } },
        { status: 404 },
      )
    }
    campaign.cover_image = { available: false, url: null }
    return HttpResponse.json({ success: true, data: null })
  }),
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
  versionPatches = []
  publishCalls = 0
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

  it(
    'validates create form and creates a campaign',
    async () => {
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
      expect(screen.getByRole('tab', { name: /Commercial version/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(screen.getByText(/Campaign draft created/i)).toBeInTheDocument()
      expect(
        await screen.findByRole('button', { name: /Create draft version/i }),
      ).toBeInTheDocument()
    },
    15000,
  )

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

  it(
    'shows detail, creates and publishes a version, then submits',
    async () => {
      const user = userEvent.setup()
      const campaign = draftCampaign({ id: 55, title: 'Submit Me' })
      campaigns = [campaign]
      versionsByCampaign[55] = []
      window.confirm = () => true
      // Clean-baseline CoverPanel loads previews via authenticated download fetch.
      server.use(
        http.get(
          '/api/v1/campaigns/:id/cover/download',
          () => new HttpResponse('cover-bytes', { headers: { 'Content-Type': 'image/jpeg' } }),
        ),
      )

      renderApp('/app/business/campaigns/55')
      expect(await screen.findByRole('heading', { name: 'Submit Me' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Campaign Cover' })).toBeInTheDocument()
      expect(screen.getByText(/No cover yet/i)).toBeInTheDocument()

      const file = new File(['cover-bytes'], 'cover.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector(
        '.campaign-cover-panel input[type="file"]',
      ) as HTMLInputElement
      expect(fileInput).toBeTruthy()
      await user.upload(fileInput, file)
      expect(await screen.findByText(/Cover uploaded/i)).toBeInTheDocument()
      expect(campaigns[0]?.cover_image?.available).toBe(true)

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
      expect(screen.getByRole('heading', { name: 'Campaign Cover' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Submit for review/i }))
      await waitFor(() => {
        expect(campaigns[0]?.status).toBe('submitted')
      })
      expect(await screen.findByText(/waiting for MarcatursHub review/i)).toBeInTheDocument()
    },
    15000,
  )

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

  describe('commercial version validation (MH-PRE-002)', () => {
    async function openVersionEditor(overrides: Partial<CampaignVersion> = {}) {
      const user = userEvent.setup()
      const campaign = draftCampaign({ id: 60, title: 'Validation Offer' })
      campaigns = [campaign]
      versionsByCampaign[60] = [{ ...draftVersion(60, 1), ...overrides }]
      renderApp('/app/business/campaigns/60')
      await screen.findByRole('heading', { name: 'Validation Offer' })
      await user.click(screen.getByRole('tab', { name: /Commercial version/i }))
      await screen.findByRole('heading', { name: 'Official payment details' })
    }

    function labelOf(input: HTMLElement): HTMLLabelElement | undefined {
      return (input as HTMLInputElement).labels?.[0]
    }

    function errorTextFor(input: HTMLElement): string {
      const ids = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
      const errorEl = ids
        .map((id) => document.getElementById(id))
        .find((el) => el?.classList.contains('field__error'))
      return errorEl?.textContent ?? ''
    }

    it('blocks publishing an incomplete draft with field errors and a focused summary', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.fn(() => true)
      window.confirm = confirmSpy
      await openVersionEditor({
        refund_cancellation_rules: null,
        payment_destination_name: null,
        payment_provider: null,
        payment_account_identifier: null,
        payment_instructions: null,
      })

      await user.click(screen.getByRole('button', { name: /Publish version/i }))

      const title = await screen.findByText('Some details need attention before publishing.')
      const summary = title.closest('.error-summary') as HTMLElement
      await waitFor(() => expect(summary).toHaveFocus())
      expect(within(summary).getAllByRole('listitem')).toHaveLength(5)
      expect(within(summary).getByRole('link', { name: 'Account name' })).toBeInTheDocument()

      const accountName = screen.getByLabelText(/^Account name/i)
      expect(accountName).toHaveAttribute('aria-invalid', 'true')
      expect(errorTextFor(accountName)).toBe('Account name is required to publish.')
      const accountId = screen.getByLabelText(/^Account number or payment ID/i)
      expect(errorTextFor(accountId)).toBe('Account number or payment ID is required to publish.')
      expect(errorTextFor(screen.getByLabelText(/^Bank or payment provider/i))).toMatch(
        /required to publish/,
      )
      expect(errorTextFor(screen.getByLabelText(/^Payment instructions/i))).toMatch(
        /required to publish/,
      )
      expect(errorTextFor(screen.getByLabelText(/^Refund \/ cancellation rules/i))).toMatch(
        /required to publish/,
      )

      expect(screen.queryByText('The given data was invalid.')).not.toBeInTheDocument()
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(publishCalls).toBe(0)

      await user.click(within(summary).getByRole('link', { name: 'Account name' }))
      expect(accountName).toHaveFocus()

      await user.type(accountName, 'Ada Solar Ltd')
      expect(accountName).not.toHaveAttribute('aria-invalid')
      expect(within(summary).getAllByRole('listitem')).toHaveLength(4)
    })

    it('maps the real 400 validation_error response onto the matching fields', async () => {
      const user = userEvent.setup()
      window.confirm = () => true
      server.use(
        http.post('/api/v1/campaigns/:id/versions/:version/publish', () =>
          HttpResponse.json(
            {
              success: false,
              error: {
                code: 'validation_error',
                message: 'The given data was invalid.',
                details: {
                  payment_provider: ['The payment provider field is required.'],
                  commission_payment_deadline_days: [
                    'The commission payment deadline days field must not be greater than 7.',
                  ],
                },
              },
            },
            { status: 400 },
          ),
        ),
      )
      await openVersionEditor()

      await user.click(screen.getByRole('button', { name: /Publish version/i }))

      const title = await screen.findByText('Some details need attention before publishing.')
      const summary = title.closest('.error-summary') as HTMLElement
      await waitFor(() => expect(summary).toHaveFocus())
      expect(within(summary).getAllByRole('listitem')).toHaveLength(2)

      const provider = screen.getByLabelText(/^Bank or payment provider/i)
      expect(provider).toHaveAttribute('aria-invalid', 'true')
      expect(errorTextFor(provider)).toBe('Bank or payment provider is required to publish.')
      const deadline = screen.getByLabelText(/^Commission payment deadline/i)
      expect(errorTextFor(deadline)).toBe(
        'Commission payment deadline must be between 1 and 7 days.',
      )
      expect(screen.queryByText('The given data was invalid.')).not.toBeInTheDocument()
      expect(versionsByCampaign[60]?.[0]?.status).toBe('draft')
    })

    it('test double returns the production validation_error shape for incomplete drafts', async () => {
      campaigns = [draftCampaign({ id: 61 })]
      versionsByCampaign[61] = [
        { ...draftVersion(61, 1), payment_provider: null, price_amount: null },
      ]
      const invalid = await fetch(
        `${window.location.origin}/api/v1/campaigns/61/versions/1/publish`,
        { method: 'POST' },
      )
      expect(invalid.status).toBe(400)
      const body = (await invalid.json()) as {
        error: { code: string; message: string; details: Record<string, string[]> }
      }
      expect(body.error.code).toBe('validation_error')
      expect(body.error.message).toBe('The given data was invalid.')
      expect(Object.keys(body.error.details).sort()).toEqual(['payment_provider', 'price_amount'])
    })

    it('marks required-to-publish fields and switches conditional commission fields', async () => {
      const user = userEvent.setup()
      await openVersionEditor()

      for (const label of [
        /^Product \/ service name/i,
        /^Pricing method/i,
        /^Commission type/i,
        /^Commission trigger/i,
        /^Commission payment deadline/i,
        /^Refund \/ cancellation rules/i,
        /^Account name/i,
        /^Bank or payment provider/i,
        /^Account number or payment ID/i,
        /^Payment instructions/i,
        /^Price amount/i,
        /^Commission rate/i,
      ]) {
        expect(labelOf(screen.getByLabelText(label))).toHaveTextContent(/required to publish/i)
      }
      for (const label of [/^Service area/i, /^Product description/i, /^Approved claims/i]) {
        expect(labelOf(screen.getByLabelText(label))).not.toHaveTextContent(/required/i)
      }
      const contact = screen.getByLabelText(/^Contact for payment questions/i)
      expect(labelOf(contact)).toHaveTextContent('(optional)')
      expect(labelOf(contact)).not.toHaveTextContent(/required/i)

      expect(screen.queryByLabelText(/^Commission amount/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/^Trigger description/i)).not.toBeInTheDocument()

      await user.selectOptions(screen.getByLabelText(/^Commission type/i), 'fixed')
      expect(screen.queryByLabelText(/^Commission rate/i)).not.toBeInTheDocument()
      const amount = screen.getByLabelText(/^Commission amount/i)
      expect(labelOf(amount)).toHaveTextContent(/required to publish/i)
      await user.type(amount, '5,000')

      await user.click(screen.getByRole('button', { name: /Save draft/i }))
      await waitFor(() => expect(versionPatches).toHaveLength(1))
      expect(versionPatches[0]?.commission_type).toBe('fixed')
      expect(versionPatches[0]?.commission_amount).toBe(5000)
      expect(versionPatches[0]?.commission_rate).toBeNull()
      expect(await screen.findByText('Draft version saved.')).toBeInTheDocument()
    })

    it('parses formatted money and clears obsolete pricing and trigger values', async () => {
      const user = userEvent.setup()
      await openVersionEditor({
        commission_trigger: 'other',
        commission_trigger_description: 'When installation is signed off',
      })

      const description = screen.getByLabelText(/^Trigger description/i)
      expect(labelOf(description)).toHaveTextContent(/required to publish/i)

      const price = screen.getByLabelText(/^Price amount/i)
      await user.clear(price)
      await user.type(price, '₦250,000.50')
      await user.click(screen.getByRole('button', { name: /Save draft/i }))
      await waitFor(() => expect(versionPatches).toHaveLength(1))
      expect(versionPatches[0]?.price_amount).toBe(250000.5)
      expect(versionPatches[0]?.commission_trigger_description).toBe(
        'When installation is signed off',
      )

      await user.selectOptions(screen.getByLabelText(/^Pricing method/i), 'quote')
      expect(screen.queryByLabelText(/^Price amount/i)).not.toBeInTheDocument()
      await user.selectOptions(
        screen.getByLabelText(/^Commission trigger/i),
        'payment_confirmation',
      )
      expect(screen.queryByLabelText(/^Trigger description/i)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Save draft/i }))
      await waitFor(() => expect(versionPatches).toHaveLength(2))
      expect(versionPatches[1]?.pricing_method).toBe('quote')
      expect(versionPatches[1]?.price_amount).toBeNull()
      expect(versionPatches[1]?.commission_trigger_description).toBeNull()
    })

    it('rejects invalid numbers instead of saving them as empty values', async () => {
      const user = userEvent.setup()
      await openVersionEditor()

      const price = screen.getByLabelText(/^Price amount/i)
      await user.clear(price)
      await user.type(price, 'abc')
      const deadline = screen.getByLabelText(/^Commission payment deadline/i)
      await user.clear(deadline)
      await user.type(deadline, 'next week')
      await user.click(screen.getByRole('button', { name: /Save draft/i }))

      expect(
        await screen.findByText('Some details need attention before saving.'),
      ).toBeInTheDocument()
      expect(errorTextFor(price)).toMatch(/Enter a valid amount/)
      expect(errorTextFor(deadline)).toBe(
        'Commission payment deadline must be between 1 and 7 days.',
      )
      expect(versionPatches).toHaveLength(0)
    })

    it('explains and enforces the 1–7 day commission payment deadline', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.fn(() => true)
      window.confirm = confirmSpy
      await openVersionEditor()

      const deadline = screen.getByLabelText(/^Commission payment deadline/i)
      expect(deadline).toHaveAccessibleDescription(/1 to 7\. Seven days is the platform maximum/)
      expect(screen.queryByText(/365/)).not.toBeInTheDocument()

      for (const value of ['8', '30', '365', '0']) {
        fireEvent.change(deadline, { target: { value } })
        await user.click(screen.getByRole('button', { name: /Save draft/i }))
        expect(errorTextFor(deadline)).toBe(
          'Commission payment deadline must be between 1 and 7 days.',
        )
        expect(deadline).toHaveAttribute('aria-invalid', 'true')
      }
      expect(versionPatches).toHaveLength(0)

      await user.click(screen.getByRole('button', { name: /Publish version/i }))
      const summary = (
        await screen.findByText('Some details need attention before publishing.')
      ).closest('.error-summary') as HTMLElement
      await waitFor(() => expect(summary).toHaveFocus())
      expect(
        within(summary).getByRole('link', { name: 'Commission payment deadline (days)' }),
      ).toBeInTheDocument()
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(publishCalls).toBe(0)

      fireEvent.change(deadline, { target: { value: '7 days' } })
      expect(deadline).not.toHaveAttribute('aria-invalid')
      await user.click(screen.getByRole('button', { name: /Save draft/i }))
      await waitFor(() => expect(versionPatches).toHaveLength(1))
      expect(versionPatches[0]?.commission_payment_deadline_days).toBe(7)
    })

    it('shows approved payment terminology with helper text in the editor', async () => {
      await openVersionEditor()
      expect(screen.getByLabelText(/^Account name/i)).toHaveAccessibleDescription(
        /Name exactly as it appears on the account/,
      )
      expect(screen.getByLabelText(/^Bank or payment provider/i)).toHaveAccessibleDescription(
        /GTBank, Access Bank, Moniepoint, OPay/,
      )
      expect(screen.getByLabelText(/^Account number or payment ID/i)).toHaveAccessibleDescription(
        /wallet or merchant ID/,
      )
      expect(screen.queryByText(/^Destination name$/)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Account identifier$/)).not.toBeInTheDocument()
    })

    it('warns before leaving a draft with unsaved changes', async () => {
      const user = userEvent.setup()
      const confirmSpy = vi.fn(() => false)
      window.confirm = confirmSpy
      await openVersionEditor()

      await user.click(screen.getByRole('tab', { name: /Overview/i }))
      expect(confirmSpy).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Campaign identity' })).toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: /Commercial version/i }))
      const productName = await screen.findByLabelText(/^Product \/ service name/i)
      await user.type(productName, ' Pro')

      await user.click(screen.getByRole('tab', { name: /Overview/i }))
      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('tab', { name: /Commercial version/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(screen.getByLabelText(/^Product \/ service name/i)).toHaveValue('Solar kit Pro')

      confirmSpy.mockReturnValue(true)
      await user.click(screen.getByRole('tab', { name: /Overview/i }))
      expect(screen.getByRole('heading', { name: 'Campaign identity' })).toBeInTheDocument()
    })
  })

  it('shows a setup checklist derived from campaign state', async () => {
    campaigns = [draftCampaign({ id: 65, title: 'Checklist Offer' })]
    versionsByCampaign[65] = []
    renderApp('/app/business/campaigns/65')
    const region = await screen.findByRole('region', { name: 'Campaign setup' })
    const items = within(region).getAllByRole('listitem')
    expect(items.map((li) => li.textContent?.replace('✓', ''))).toEqual([
      'Identity: done',
      'Cover (optional): not done yet',
      'Commercial terms: not done yet',
      'Version published: not done yet',
      'Submitted for review: not done yet',
    ])
    await userEvent.click(within(region).getByRole('button', { name: /Open commercial version/i }))
    expect(screen.getByRole('tab', { name: /Commercial version/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('shows category errors against the Category field on campaign identity', async () => {
    const user = userEvent.setup()
    campaigns = [draftCampaign({ id: 66, title: 'Identity Offer' })]
    server.use(
      http.patch('/api/v1/campaigns/:id', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'validation_error',
              message: 'The given data was invalid.',
              details: { category_id: ['The selected category id is invalid.'] },
            },
          },
          { status: 400 },
        ),
      ),
    )
    renderApp('/app/business/campaigns/66')
    await screen.findByRole('heading', { name: 'Campaign identity' })
    await user.click(screen.getByRole('button', { name: /Save identity/i }))
    const category = screen.getByLabelText('Category')
    await waitFor(() => expect(category).toHaveAttribute('aria-invalid', 'true'))
    expect(category).toHaveAccessibleDescription('The selected category id is invalid.')
    expect(screen.queryByText('The given data was invalid.')).not.toBeInTheDocument()

    server.use(
      http.patch('/api/v1/campaigns/:id', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'business_validation',
              message: 'This category cannot be used for a campaign.',
            },
          },
          { status: 422 },
        ),
      ),
    )
    await user.click(screen.getByRole('button', { name: /Save identity/i }))
    await waitFor(() =>
      expect(category).toHaveAccessibleDescription('This category cannot be used for a campaign.'),
    )
  })

  it('handles not-found campaign detail', async () => {
    renderApp('/app/business/campaigns/999')
    expect(await screen.findByText(/Campaign not found/i)).toBeInTheDocument()
  })

  it('replaces and removes campaign cover with confirmations', async () => {
    const user = userEvent.setup()
    window.confirm = () => true
    campaigns = [
      draftCampaign({
        id: 88,
        title: 'Covered Offer',
        cover_image: {
          available: true,
          url: 'http://localhost/api/v1/campaigns/88/cover/download',
          mime_type: 'image/jpeg',
          size_bytes: 2048,
          original_filename: 'old.jpg',
        },
      }),
    ]
    server.use(
      http.get(
        '/api/v1/campaigns/:id/cover/download',
        () => new HttpResponse('old-cover', { headers: { 'Content-Type': 'image/jpeg' } }),
      ),
    )

    renderApp('/app/business/campaigns/88')
    expect(await screen.findByRole('heading', { name: 'Campaign Cover' })).toBeInTheDocument()
    expect(
      await screen.findByRole('img', { name: /Cover preview for Covered Offer/i }),
    ).toBeInTheDocument()

    const file = new File(['new-cover'], 'new.png', { type: 'image/png' })
    const fileInput = document.querySelector(
      '.campaign-cover-panel input[type="file"]',
    ) as HTMLInputElement
    await user.upload(fileInput, file)
    expect(await screen.findByText(/Cover replaced/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Remove cover/i }))
    expect(await screen.findByText(/Cover removed/i)).toBeInTheDocument()
    expect(await screen.findByText(/No cover yet/i)).toBeInTheDocument()
    expect(campaigns[0]?.cover_image?.available).toBe(false)
  })

  it('surfaces cover validation errors from the API', async () => {
    const user = userEvent.setup()
    window.confirm = () => true
    campaigns = [draftCampaign({ id: 89, title: 'Strict Cover' })]

    server.use(
      http.post('/api/v1/campaigns/:id/cover', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'validation_error',
              message: 'The cover image must be a file of type: jpeg, png, webp.',
            },
          },
          { status: 422 },
        ),
      ),
    )

    renderApp('/app/business/campaigns/89')
    await screen.findByRole('heading', { name: 'Campaign Cover' })
    const fileInput = document.querySelector(
      '.campaign-cover-panel input[type="file"]',
    ) as HTMLInputElement
    await user.upload(fileInput, new File(['img'], 'cover.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /jpeg, png, webp|rejected|JPEG, PNG, or WebP/i,
    )
  })

  it('surfaces forbidden cover mutation errors', async () => {
    const user = userEvent.setup()
    window.confirm = () => true
    campaigns = [draftCampaign({ id: 90, title: 'Forbidden Cover' })]

    server.use(
      http.post('/api/v1/campaigns/:id/cover', () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'forbidden', message: 'Forbidden' },
          },
          { status: 403 },
        ),
      ),
    )

    renderApp('/app/business/campaigns/90')
    await screen.findByRole('heading', { name: 'Campaign Cover' })
    const fileInput = document.querySelector(
      '.campaign-cover-panel input[type="file"]',
    ) as HTMLInputElement
    await user.upload(fileInput, new File(['img'], 'cover.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/i)
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
      await screen.findByRole('heading', { name: /marketplace participants/i }),
    ).toBeInTheDocument()
  })
})
