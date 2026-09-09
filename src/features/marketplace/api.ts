import { apiRequest, apiRequestResult } from '@/shared/api/client'
import type { MarketplaceCampaignCard, MarketplaceCampaignDetail } from './types'

export type MarketplaceListParams = {
  q?: string
  per_page?: number
  page?: number
}

export async function fetchMarketplaceCampaigns(
  params: MarketplaceListParams = {},
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.page) search.set('page', String(params.page))
  const qs = search.toString()
  const path = qs ? `/marketplace/campaigns?${qs}` : '/marketplace/campaigns'

  const result = await apiRequestResult<MarketplaceCampaignCard[]>(path, {
    method: 'GET',
    signal,
    notifyOnUnauthorized: false,
  })

  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchMarketplaceCampaign(id: number, signal?: AbortSignal) {
  return apiRequest<MarketplaceCampaignDetail>(`/marketplace/campaigns/${id}`, {
    method: 'GET',
    signal,
    notifyOnUnauthorized: false,
  })
}
