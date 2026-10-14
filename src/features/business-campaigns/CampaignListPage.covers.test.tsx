import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { CampaignListPage } from '@/features/business-campaigns/CampaignListPage'
import type { BusinessCampaign } from '@/features/business-campaigns/types'
import {
  installIntersectionObserver,
  observedElements,
  scrollIntoView,
} from '@/test/intersectionObserver'

function coveredCampaign(id: number, title: string): BusinessCampaign {
  return {
    id,
    title,
    status: 'active',
    category: {
      id: 10,
      name: 'Solar & Energy',
      slug: 'solar',
      listing_status: 'allowed',
      sort_order: 1,
    },
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
    cover_image: {
      available: true,
      url: `http://localhost:8000/api/v1/campaigns/${id}/cover/download`,
      mime_type: 'image/jpeg',
      size_bytes: 2048,
      original_filename: `cover-${id}.jpg`,
    },
  }
}

const campaigns = [
  coveredCampaign(1, 'Solar Kits'),
  coveredCampaign(2, 'Inverter Bundle'),
  coveredCampaign(3, 'Battery Packs'),
]

let coverRequests: string[] = []

const server = setupServer(
  http.get('/api/v1/campaigns', () => HttpResponse.json({ success: true, data: campaigns })),
  http.get('/api/v1/campaigns/:id/cover/download', ({ params }) => {
    coverRequests.push(String(params.id))
    if (params.id === '2') {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Unavailable.' } },
        { status: 500 },
      )
    }
    return new HttpResponse(`cover-${String(params.id)}`, {
      headers: { 'Content-Type': 'image/jpeg' },
    })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  coverRequests = []
  installIntersectionObserver()
})
afterEach(() => {
  server.resetHandlers()
  vi.unstubAllGlobals()
})
afterAll(() => server.close())

function renderList() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/app/business/campaigns']}>
        <CampaignListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function rowFor(title: string) {
  return screen.getByRole('link', { name: new RegExp(title) })
}

function thumbFor(title: string) {
  return rowFor(title).querySelector('.campaign-row__thumb')!
}

describe('Business campaign list covers', () => {
  it('only downloads covers for rows that approach the viewport', async () => {
    renderList()
    expect(await screen.findByText('Battery Packs')).toBeInTheDocument()

    expect(coverRequests).toEqual([])
    expect(observedElements()).toHaveLength(3)

    scrollIntoView(thumbFor('Solar Kits'))
    await waitFor(() => expect(rowFor('Solar Kits').querySelector('img')).not.toBeNull())
    expect(coverRequests).toEqual(['1'])

    scrollIntoView(thumbFor('Battery Packs'))
    await waitFor(() => expect(rowFor('Battery Packs').querySelector('img')).not.toBeNull())
    expect(coverRequests).toEqual(['1', '3'])
    expect(rowFor('Inverter Bundle').querySelector('img')).toBeNull()
  })

  it('stays usable when a visible cover cannot be loaded', async () => {
    const user = userEvent.setup()
    renderList()
    expect(await screen.findByText('Inverter Bundle')).toBeInTheDocument()

    scrollIntoView(thumbFor('Inverter Bundle'))
    await waitFor(() => expect(coverRequests).toEqual(['2']))

    const row = rowFor('Inverter Bundle')
    expect(row.querySelector('img')).toBeNull()
    expect(
      within(row).getByText('Solar & Energy', { selector: '.campaign-cover__fallback-kicker' }),
    ).toBeInTheDocument()
    expect(row).toHaveAttribute('href', '/app/business/campaigns/2')

    await user.type(screen.getByLabelText('Search'), 'Inverter')
    expect(screen.getByText('1 of 3 campaigns')).toBeInTheDocument()
    expect(rowFor('Inverter Bundle')).toBeInTheDocument()
    expect(coverRequests).toEqual(['2'])
  })
})
