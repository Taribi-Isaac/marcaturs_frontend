import { apiRequest, apiRequestResult } from '@/shared/api/client'
import type { CategorySummary, MarketplaceCampaignCard, MarketplaceCampaignDetail } from './types'

export type MarketplaceListParams = {
  q?: string
  category_id?: number
  commission_type?: string
  status?: string
  featured?: boolean
  verified?: boolean
  service_area?: string
  per_page?: number
  page?: number
}

export async function fetchMarketplaceCampaigns(
  params: MarketplaceListParams = {},
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.category_id) search.set('category_id', String(params.category_id))
  if (params.commission_type) search.set('commission_type', params.commission_type)
  if (params.status) search.set('status', params.status)
  if (params.featured != null) search.set('featured', String(params.featured))
  if (params.verified != null) search.set('verified', String(params.verified))
  if (params.service_area) search.set('service_area', params.service_area)
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

export async function fetchCategories(signal?: AbortSignal) {
  return apiRequest<CategorySummary[]>('/categories', {
    method: 'GET',
    signal,
    notifyOnUnauthorized: false,
  })
}
