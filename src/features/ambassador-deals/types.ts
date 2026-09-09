export type DealStatus = 'payment_pending' | 'sealed' | 'completed' | 'cancelled'

export type EvidenceKind =
  'receipt' | 'transfer_confirmation' | 'transaction_screenshot' | 'transaction_reference' | 'other'

export type EvidenceStatus = 'submitted' | 'rejected'

export type PartyRef = {
  id: number
  name?: string
  role: string
}

export type DealCommission = {
  id: number
  status: 'due' | 'paid' | 'received'
  amount: string | number
  currency: string
  due_at: string | null
  paid_at: string | null
  received_at: string | null
  is_overdue: boolean
} | null

export type DealEvent = {
  id: number
  type: string
  actor: { id: number; role: string } | null
  previous_status: string | null
  new_status: string | null
  metadata: unknown
  created_at: string
}

export type Deal = {
  id: number
  status: DealStatus
  business: PartyRef
  ambassador: PartyRef
  campaign: { id: number; title: string; status: string }
  campaign_version: { id: number; version_number: number }
  product_name: string | null
  pricing_method: string | null
  price_amount: string | number | null
  price_currency: string | null
  commission_type: string | null
  commission_rate: string | number | null
  commission_amount: string | number | null
  commission_trigger: string | null
  commission_trigger_description: string | null
  commission_payment_deadline_days: number | null
  minimum_qualifying_amount: string | number | null
  qualifying_conditions: string | null
  expected_transaction_amount: string | number | null
  confirmed_payment_amount: string | number | null
  confirmed_at: string | null
  cancelled_at: string | null
  has_open_dispute: boolean
  open_dispute_count: number
  commission?: DealCommission
  events?: DealEvent[]
  created_at: string
  updated_at: string
}

export type PaymentEvidence = {
  id: number
  deal_id: number
  kind: EvidenceKind
  status: EvidenceStatus
  reference_number: string | null
  amount: string | number | null
  currency: string | null
  paid_on: string | null
  note: string | null
  has_file: boolean
  original_filename?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  submitted_by: PartyRef
  submitted_at: string | null
  created_at: string
  rejection_reason?: string | null
}

export type OfficialPaymentShare = {
  token: string
  path: string
  share_path: string
  share_url: string | null
}

export type OfficialPaymentInformation = {
  financial_boundary: {
    customer_pays: string
    platform_holds_customer_funds: boolean
    statement: string
  }
  share: OfficialPaymentShare
  business: {
    legal_name: string | null
    trading_name: string | null
    operating_location: string | null
    website: string | null
    verification_status: string
  }
  campaign: {
    id: number
    title: string
    status: string
    category: { id: number; name: string; slug: string } | null
  }
  campaign_version: {
    version_number: number | null
    status: string | null
    published_at: string | null
    product_name: string | null
    product_description: string | null
    service_area: string | null
    pricing_method: string | null
    price_amount: string | number | null
    price_currency: string | null
  }
  payment_destination: {
    destination_name: string | null
    provider: string | null
    account_identifier: string | null
    instructions: string | null
    contact: string | null
  }
}
