import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CreateDealPage } from '@/features/ambassador-deals/CreateDealPage'
import { AuthContext, type AuthContextValue } from '@/features/auth/authContext'
import { CampaignCreatePage } from '@/features/business-campaigns/CampaignCreatePage'
import { CampaignDetailPage } from '@/features/marketplace/CampaignDetailPage'

vi.mock('@/shared/analytics/track', () => ({
  trackDealStart: vi.fn(),
  trackCampaignCreate: vi.fn(),
  trackCampaignView: vi.fn(),
}))

vi.mock('@/features/marketplace/api', () => ({
  fetchMarketplaceCampaign: vi.fn(),
}))

vi.mock('@/features/ambassador-deals/api', () => ({
  createDeal: vi.fn(),
  marketplaceResourceDownloadUrl: vi.fn(),
}))

vi.mock('@/features/business-campaigns/api', () => ({
  createCampaign: vi.fn(),
  fetchCategories: vi.fn(),
}))

import { createDeal } from '@/features/ambassador-deals/api'
import { createCampaign, fetchCategories } from '@/features/business-campaigns/api'
import { fetchMarketplaceCampaign } from '@/features/marketplace/api'
import { trackCampaignCreate, trackCampaignView, trackDealStart } from '@/shared/analytics/track'

const campaign = {
  id: 82,
  title: 'Demo Solar Street Light Kits',
  status: 'active',
  product_name: 'Solar kit',
  price_amount: '250000.00',
  price_currency: 'NGN',
  commission_type: 'percentage',
  commission_rate: '12.00',
  commission_amount: null,
  business: {
    trading_name: 'Ada Solar',
    legal_name: 'Ada Solar Ventures Ltd',
    verification_status: 'verified',
  },
  marketing_resources: [],
  qualifying_conditions: null,
}

const guest: AuthContextValue = {
  status: 'unauthenticated',
  user: null,
  isBootstrapping: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}

function wrapper(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('product analytics events', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('emits deal start only after the deal is created, without the amount', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchMarketplaceCampaign).mockResolvedValue(campaign as never)
    vi.mocked(createDeal).mockResolvedValue({ id: 9 } as never)
    render(<CreateDealPage />, { wrapper: wrapper('/app/ambassador/deals/new?campaign=82') })
    await screen.findByRole('button', { name: 'Create Deal' })
    await user.type(screen.getByLabelText(/Expected transaction amount/i), '5000')
    await user.click(screen.getByRole('button', { name: 'Create Deal' }))
    await waitFor(() => expect(trackDealStart).toHaveBeenCalledWith(82))
    expect(JSON.stringify(vi.mocked(trackDealStart).mock.calls)).not.toContain('5000')
    expect(JSON.stringify(vi.mocked(trackDealStart).mock.calls)).not.toContain('Ada')
  })

  it('does not emit deal start when creation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchMarketplaceCampaign).mockResolvedValue(campaign as never)
    vi.mocked(createDeal).mockRejectedValue(new Error('nope'))
    render(<CreateDealPage />, { wrapper: wrapper('/app/ambassador/deals/new?campaign=82') })
    await screen.findByRole('button', { name: 'Create Deal' })
    await user.click(screen.getByRole('button', { name: 'Create Deal' }))
    await waitFor(() => expect(createDeal).toHaveBeenCalled())
    expect(trackDealStart).not.toHaveBeenCalled()
  })

  it('emits campaign creation only after the draft is saved, without the title', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchCategories).mockResolvedValue([
      { id: 3, name: 'Energy', slug: 'energy', listing_status: 'allowed' },
    ])
    vi.mocked(createCampaign).mockResolvedValue({
      id: 15,
      title: 'Private launch title',
      status: 'draft',
      listing_starts_at: null,
      listing_expires_at: null,
      submitted_at: null,
      approved_at: null,
      activated_at: null,
      deactivated_at: null,
    } as never)
    render(<CampaignCreatePage />, { wrapper: wrapper('/app/business/campaigns/new') })
    await user.type(await screen.findByLabelText('Campaign title'), 'Private launch title')
    await user.selectOptions(screen.getByLabelText('Category'), '3')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => expect(trackCampaignCreate).toHaveBeenCalledWith(15))
    expect(JSON.stringify(vi.mocked(trackCampaignCreate).mock.calls)).not.toContain('Private')
  })

  it('emits a campaign view only after the public campaign loads', async () => {
    vi.mocked(fetchMarketplaceCampaign).mockResolvedValue(campaign as never)
    render(
      <Routes>
        <Route
          path="/campaigns/:id"
          element={
            <AuthContext.Provider value={guest}>
              <CampaignDetailPage />
            </AuthContext.Provider>
          }
        />
      </Routes>,
      { wrapper: wrapper('/campaigns/82') },
    )
    await waitFor(() => expect(trackCampaignView).toHaveBeenCalledWith(82))
    expect(JSON.stringify(vi.mocked(trackCampaignView).mock.calls)).not.toContain('Solar')
    expect(JSON.stringify(vi.mocked(trackCampaignView).mock.calls)).not.toContain('250000')
  })

  it('does not emit a campaign view when the public campaign cannot be loaded', async () => {
    vi.mocked(fetchMarketplaceCampaign).mockRejectedValue(new Error('missing'))
    render(
      <Routes>
        <Route
          path="/campaigns/:id"
          element={
            <AuthContext.Provider value={guest}>
              <CampaignDetailPage />
            </AuthContext.Provider>
          }
        />
      </Routes>,
      { wrapper: wrapper('/campaigns/82') },
    )
    expect(await screen.findByText('Campaign unavailable')).toBeInTheDocument()
    expect(trackCampaignView).not.toHaveBeenCalled()
  })
})
