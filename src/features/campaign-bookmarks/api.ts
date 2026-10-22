import { apiRequest, apiRequestResult } from '@/shared/api/client'
import { ApiClientError } from '@/shared/api/errors'
import type { CampaignBookmark } from './types'

export const CAMPAIGN_BOOKMARKS_QUERY_KEY = ['campaign-bookmarks'] as const

const LOOKUP_PAGE_SIZE = 100
const MAX_LOOKUP_PAGES = 50

export type CampaignBookmarkList = {
  items: CampaignBookmark[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number | null
    to: number | null
  }
}

export async function fetchCampaignBookmarks(
  params: { page?: number; per_page?: number } = {},
  signal?: AbortSignal,
): Promise<CampaignBookmarkList> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  const qs = search.toString()
  const path = qs ? `/ambassadors/campaign-bookmarks?${qs}` : '/ambassadors/campaign-bookmarks'

  const result = await apiRequestResult<CampaignBookmark[]>(path, {
    method: 'GET',
    signal,
  })

  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function campaignIsBookmarked(
  campaignId: number,
  signal?: AbortSignal,
): Promise<boolean> {
  let page = 1
  let lastPage = 1

  do {
    const result = await fetchCampaignBookmarks({ page, per_page: LOOKUP_PAGE_SIZE }, signal)
    if (result.items.some((item) => item.campaign.id === campaignId)) {
      return true
    }
    lastPage = result.pagination?.last_page ?? 1
    page += 1
  } while (page <= lastPage && page <= MAX_LOOKUP_PAGES)

  return false
}

export async function saveCampaignBookmark(campaignId: number) {
  return apiRequest<{ campaign_id: number; bookmarked_at: string }>(
    `/marketplace/campaigns/${campaignId}/bookmark`,
    { method: 'PUT' },
  )
}

export async function removeCampaignBookmark(campaignId: number) {
  await apiRequest<void>(`/marketplace/campaigns/${campaignId}/bookmark`, {
    method: 'DELETE',
  })
}

export function bookmarkActionError(error: unknown, action: 'save' | 'remove'): string {
  if (error instanceof ApiClientError) {
    if (action === 'save' && error.status === 404) {
      return 'This campaign can no longer be saved.'
    }
    return error.message
  }

  return action === 'save' ? 'Could not save this campaign.' : 'Could not remove this campaign.'
}
