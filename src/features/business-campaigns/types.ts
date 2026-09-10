export type CampaignStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'deactivated'
  | 'suspended'
  | 'closed'

export type VersionStatus = 'draft' | 'published'

export type PricingMethod = 'fixed' | 'quote' | 'other'
export type CommissionType = 'percentage' | 'fixed'
export type CommissionTrigger = 'payment_confirmation' | 'other'

export type CategorySummary = {
  id: number
  name: string
  slug: string
  description?: string | null
  listing_status: string
  sort_order?: number
}

export type CurrentVersionSummary = {
  id: number
  version_number: number
  status: VersionStatus
} | null

export type { CampaignCoverImage } from '@/features/marketplace/cover'

export type BusinessCampaign = {
  id: number
  title: string
  status: CampaignStatus
  category?: CategorySummary
  current_version?: CurrentVersionSummary
  cover_image?: import('@/features/marketplace/cover').CampaignCoverImage | null
  listing_starts_at: string | null
  listing_expires_at: string | null
  submitted_at: string | null
  approved_at: string | null
  activated_at: string | null
  deactivated_at: string | null
  expired_at: string | null
  closed_at: string | null
  suspended_at: string | null
  review_reason: string | null
  created_at: string
  updated_at: string
}

export type CampaignVersion = {
  id: number
  campaign_id: number
  version_number: number
  status: VersionStatus
  product_name: string | null
  product_description: string | null
  pricing_method: PricingMethod | null
  price_amount: string | number | null
  price_currency: string | null
  service_area: string | null
  commission_type: CommissionType | null
  commission_rate: string | number | null
  commission_amount: string | number | null
  commission_trigger: CommissionTrigger | null
  commission_trigger_description: string | null
  commission_payment_deadline_days: number | null
  minimum_qualifying_amount: string | number | null
  qualifying_conditions: string | null
  refund_cancellation_rules: string | null
  approved_claims: string | null
  prohibited_claims: string | null
  brand_use_rules: string | null
  geographic_customer_restrictions: string | null
  approved_copy: string | null
  marketing_links: string[]
  payment_destination_name: string | null
  payment_provider: string | null
  payment_account_identifier: string | null
  payment_instructions: string | null
  payment_contact: string | null
  terms: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type CampaignVersionInput = Partial<{
  product_name: string | null
  product_description: string | null
  pricing_method: PricingMethod | null
  price_amount: number | null
  price_currency: string | null
  service_area: string | null
  commission_type: CommissionType | null
  commission_rate: number | null
  commission_amount: number | null
  commission_trigger: CommissionTrigger | null
  commission_trigger_description: string | null
  commission_payment_deadline_days: number | null
  minimum_qualifying_amount: number | null
  qualifying_conditions: string | null
  refund_cancellation_rules: string | null
  approved_claims: string | null
  prohibited_claims: string | null
  brand_use_rules: string | null
  geographic_customer_restrictions: string | null
  approved_copy: string | null
  marketing_links: string[]
  payment_destination_name: string | null
  payment_provider: string | null
  payment_account_identifier: string | null
  payment_instructions: string | null
  payment_contact: string | null
  terms: string | null
}>

export type MarketingResourceType = 'image' | 'flyer' | 'video' | 'brochure' | 'document'

export type MarketingResource = {
  id: number
  type: MarketingResourceType
  title: string
  description: string | null
  mime_type: string
  original_filename?: string
  size_bytes: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type FeePackage = {
  id: number
  name: string
  duration_days: number
  amount_minor: number
  currency: string
  created_at?: string
  updated_at?: string
}

export type FeaturedStatus = {
  is_featured: boolean
  expires_at: string | null
  purchases: Array<{
    id: number
    campaign_id: number
    package_name: string
    duration_days: number
    amount_minor: number
    currency: string
    activated_at: string | null
    expires_at: string | null
    is_active: boolean
  }>
}

export type PaymentInitializeResult = {
  authorization_url: string
  access_code: string
  payment: {
    id: number
    reference: string
    purpose: string
    provider: string
    status: string
    amount_minor: number
    currency: string
    duration_days: number
    paid_at: string | null
  }
}
