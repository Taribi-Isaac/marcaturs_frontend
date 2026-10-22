import type { MarketplaceCampaignCard } from '@/features/marketplace/types'

export type UnavailableCampaignSummary = {
  id: number
  title: string
  status: string
}

export type CampaignBookmark = {
  bookmarked_at: string
  discoverable: boolean
  campaign: MarketplaceCampaignCard | UnavailableCampaignSummary
}

export type SavedCampaignBookmark = CampaignBookmark & {
  discoverable: true
  campaign: MarketplaceCampaignCard
}

export function isDiscoverableBookmark(
  bookmark: CampaignBookmark,
): bookmark is SavedCampaignBookmark {
  return bookmark.discoverable === true
}
