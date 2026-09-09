export type MarketplaceCampaignCard = {
  id: number
  title: string
  status: string
  category: {
    id: number
    name: string
    slug: string
    listing_status: string
  } | null
  business: {
    legal_name: string | null
    trading_name: string | null
    verification_status: string
    description?: string | null
    operating_location?: string | null
    website?: string | null
  }
  product_name: string | null
  product_description: string | null
  pricing_method: string | null
  price_amount: string | null
  price_currency: string | null
  commission_type: string | null
  commission_rate: string | null
  commission_amount: string | null
  commission_trigger: string | null
  service_area: string | null
  version_number: number | null
  is_featured: boolean
  listing_starts_at: string | null
  listing_expires_at: string | null
}

export type MarketplaceCampaignDetail = MarketplaceCampaignCard & {
  commission_trigger_description: string | null
  commission_payment_deadline_days: number | null
  minimum_qualifying_amount: string | null
  qualifying_conditions: string | null
  refund_cancellation_rules: string | null
  approved_claims: string | null
  prohibited_claims: string | null
  brand_use_rules: string | null
  geographic_customer_restrictions: string | null
  approved_copy: string | null
  marketing_links: string[]
  terms: string | null
  payment_destination_name: string | null
  payment_provider: string | null
  marketing_resources: Array<{
    id: number
    title?: string | null
    type?: string | null
    original_filename?: string | null
  }>
}
