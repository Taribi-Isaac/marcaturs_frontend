export type RequirementType = 'text' | 'document' | 'email' | 'phone' | 'other'

export type OverallVerificationStatus =
  'NOT_STARTED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'MORE_INFORMATION_REQUIRED'

export type SubmissionStatus =
  'pending' | 'under_review' | 'approved' | 'rejected' | 'more_information_required'

export type VerificationRequirement = {
  id: number
  name: string
  description: string | null
  participant_type: 'BUSINESS' | 'AMBASSADOR'
  requirement_type: RequirementType
  is_required: boolean
  is_active: boolean
  sort_order: number
}

/** Participant-safe evidence metadata only — never path/disk/keys. */
export type VerificationEvidenceMeta = {
  id: number
  original_filename: string
  mime_type: string
  size_bytes: number
  created_at: string | null
}

export type VerificationSubmission = {
  id: number
  requirement_id: number
  status: SubmissionStatus
  text_value: string | null
  review_reason: string | null
  current_version: number
  submitted_at: string | null
  evidence: VerificationEvidenceMeta[]
}

export type VerificationRequirementItem = {
  requirement: VerificationRequirement
  submission: VerificationSubmission | null
}

export type VerificationStatusPayload = {
  overall_status: OverallVerificationStatus
  requirements: VerificationRequirementItem[]
}

/** UX aid only — backend remains authoritative (default 5120 KB). */
export const VERIFICATION_MAX_EVIDENCE_KB = 5120

export const VERIFICATION_EVIDENCE_ACCEPT =
  '.pdf,.jpeg,.jpg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'
