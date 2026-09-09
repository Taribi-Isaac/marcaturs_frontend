import type {
  OverallVerificationStatus,
  RequirementType,
  SubmissionStatus,
  VerificationRequirementItem,
} from './types'

export function overallStatusLabel(status: OverallVerificationStatus): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'Not started'
    case 'PENDING':
      return 'Pending review'
    case 'UNDER_REVIEW':
      return 'Under review'
    case 'VERIFIED':
      return 'Verified'
    case 'REJECTED':
      return 'Action needed'
    case 'MORE_INFORMATION_REQUIRED':
      return 'More information required'
    default:
      return status
  }
}

export function overallStatusBadgeClass(status: OverallVerificationStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'badge badge--success'
    case 'REJECTED':
    case 'MORE_INFORMATION_REQUIRED':
      return 'badge badge--warning'
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'badge'
    default:
      return 'badge badge--neutral'
  }
}

export function overallStatusExplanation(status: OverallVerificationStatus): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'Submit the required items below to begin verification. Optional items do not block verification.'
    case 'PENDING':
      return 'Your submissions are waiting for review. You can continue with optional items while you wait.'
    case 'UNDER_REVIEW':
      return 'A reviewer is assessing your submissions. No further action is needed unless something is returned.'
    case 'VERIFIED':
      return 'All active required requirements are approved. Optional items remain available if you want to complete them.'
    case 'REJECTED':
      return 'At least one required submission needs to be updated. Review the items marked for attention and resubmit.'
    case 'MORE_INFORMATION_REQUIRED':
      return 'Additional information is needed on one or more required items. Update those submissions to continue.'
    default:
      return 'Verification status is provided by the MarcatursHub verification service.'
  }
}

export function submissionStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'pending':
      return 'Submitted — pending review'
    case 'under_review':
      return 'Under review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected — resubmit'
    case 'more_information_required':
      return 'More information required'
    default:
      return status
  }
}

export function submissionStatusBadgeClass(status: SubmissionStatus): string {
  switch (status) {
    case 'approved':
      return 'badge badge--success'
    case 'rejected':
    case 'more_information_required':
      return 'badge badge--warning'
    case 'pending':
    case 'under_review':
      return 'badge'
    default:
      return 'badge badge--neutral'
  }
}

export function requirementTypeLabel(type: RequirementType): string {
  switch (type) {
    case 'text':
      return 'Text response'
    case 'document':
      return 'Document upload'
    case 'email':
      return 'Email'
    case 'phone':
      return 'Phone'
    case 'other':
      return 'Response'
    default:
      return type
  }
}

export function canSubmitNew(item: VerificationRequirementItem): boolean {
  return item.submission == null
}

export function canResubmit(item: VerificationRequirementItem): boolean {
  const status = item.submission?.status
  return status === 'rejected' || status === 'more_information_required'
}

export function needsAttention(item: VerificationRequirementItem): boolean {
  if (canSubmitNew(item) && item.requirement.is_required) return true
  return canResubmit(item)
}

/** Presentational only — does not override backend overall_status. */
export function requiredProgress(items: VerificationRequirementItem[]) {
  const required = items.filter((item) => item.requirement.is_required)
  const approved = required.filter((item) => item.submission?.status === 'approved').length
  return { approved, total: required.length }
}
