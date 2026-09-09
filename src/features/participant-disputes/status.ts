import type { UserRole } from '@/shared/types/auth'
import type { Dispute, DisputeStatus } from './types'

export function disputeStatusLabel(status: DisputeStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'under_review':
      return 'Under review'
    case 'evidence_requested':
      return 'Evidence requested'
    case 'decision_pending':
      return 'Decision pending'
    case 'resolved':
      return 'Resolved'
    case 'closed':
      return 'Closed'
    default:
      return status
  }
}

export function disputeStatusBadgeClass(status: DisputeStatus): string {
  switch (status) {
    case 'submitted':
    case 'evidence_requested':
      return 'badge badge--warning'
    case 'under_review':
    case 'decision_pending':
      return 'badge'
    case 'resolved':
    case 'closed':
      return 'badge badge--success'
    default:
      return 'badge badge--neutral'
  }
}

export function disputeAttention(status: DisputeStatus, role: UserRole) {
  switch (status) {
    case 'submitted':
      return {
        tone: 'wait',
        title: 'Case opened',
        body:
          role === 'AMBASSADOR'
            ? 'Your dispute is open and awaiting review.'
            : 'This commercial dispute case is open and awaiting review.',
      }
    case 'under_review':
      return {
        tone: 'action',
        title: 'Under review',
        body: 'MarcatursHub is reviewing the case. Deal and commission states remain separate.',
      }
    case 'evidence_requested':
      return {
        tone: 'action',
        title: 'Evidence requested',
        body: 'Additional supporting files can be uploaded in this state.',
      }
    case 'decision_pending':
      return {
        tone: 'wait',
        title: 'Decision pending',
        body: 'Review is nearing a decision. No financial reversal is performed automatically.',
      }
    case 'resolved':
      return {
        tone: 'success',
        title: 'Resolved',
        body: 'Resolution notes are visible when the backend exposes them to participants.',
      }
    case 'closed':
      return {
        tone: 'neutral',
        title: 'Closed',
        body: 'This dispute case is closed.',
      }
  }
}

export function disputeEventLabel(type: string): string {
  switch (type) {
    case 'dispute_created':
      return 'Case opened'
    case 'dispute_evidence_requested':
      return 'Evidence requested'
    case 'dispute_resolved':
      return 'Resolved'
    case 'dispute_closed':
      return 'Closed'
    case 'dispute_review_started':
      return 'Review started'
    case 'dispute_review_resumed':
      return 'Review resumed'
    case 'dispute_decision_pending':
      return 'Decision pending'
    default:
      return type.replaceAll('_', ' ')
  }
}

export function canUploadParticipantAttachment(dispute: Dispute): boolean {
  return ['submitted', 'under_review', 'evidence_requested'].includes(dispute.status)
}

export function counterpartyLabel(dispute: Dispute, role: UserRole): string {
  const other =
    role === 'BUSINESS'
      ? ([dispute.reporter, dispute.accused].find((party) => party?.role === 'AMBASSADOR') ?? null)
      : ([dispute.reporter, dispute.accused].find((party) => party?.role === 'BUSINESS') ?? null)
  if (!other) return role === 'BUSINESS' ? 'Ambassador' : 'Business'
  if (role === 'BUSINESS') {
    return other.role === 'AMBASSADOR' ? `Ambassador #${other.id}` : `Participant #${other.id}`
  }
  return other.role === 'BUSINESS' ? `Business #${other.id}` : `Participant #${other.id}`
}
