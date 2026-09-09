import type { Deal } from '@/features/ambassador-deals/types'

export type DisputeStatus =
  'submitted' | 'under_review' | 'evidence_requested' | 'decision_pending' | 'resolved' | 'closed'

export type DisputeParty = {
  id: number
  role: string
} | null

export type DisputeCategory = {
  id: number
  code: string
  name: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export type DisputeAttachment = {
  id: number
  uploader: DisputeParty
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
  note: string | null
  has_file: boolean
  created_at: string | null
}

export type DisputeEvent = {
  id: number
  type: string
  previous_status: string | null
  new_status: string | null
  actor: DisputeParty
  metadata: Record<string, unknown>
  created_at: string | null
}

export type Dispute = {
  id: number
  reference: string
  status: DisputeStatus
  deal_id: number
  commission_id: number | null
  category: DisputeCategory | null
  reporter: DisputeParty
  accused: DisputeParty
  description: string
  decision_notes: string | null
  action_notes: string | null
  resolved_at: string | null
  closed_at: string | null
  attachments?: DisputeAttachment[]
  events?: DisputeEvent[]
  deal?: Deal | null
  commission?: {
    id: number
    status: 'due' | 'paid' | 'received'
    amount: string | number
    currency: string
    due_at: string | null
    paid_at: string | null
    received_at: string | null
    is_overdue: boolean
  } | null
  created_at: string | null
  updated_at: string | null
}
