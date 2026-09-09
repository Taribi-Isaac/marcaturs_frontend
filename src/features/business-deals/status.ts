import type { Deal, DealStatus, PaymentEvidence } from '@/features/ambassador-deals/types'

export type { Deal, DealStatus, PaymentEvidence }

export type BusinessAttention = {
  priority: number
  label: string
  tone: 'action' | 'wait' | 'success' | 'danger' | 'neutral'
}

export function businessDealAttention(options: {
  status: DealStatus
  hasSubmittedEvidence?: boolean | null
  commissionStatus?: string | null
  isOverdue?: boolean
  hasOpenDispute?: boolean
}): BusinessAttention {
  if (options.hasOpenDispute) {
    return { priority: 1, label: 'Open dispute — review', tone: 'danger' }
  }
  if (options.status === 'cancelled') {
    return { priority: 90, label: 'Cancelled', tone: 'neutral' }
  }
  if (options.status === 'completed') {
    return { priority: 80, label: 'Completed', tone: 'success' }
  }
  if (options.status === 'sealed') {
    if (options.isOverdue || options.commissionStatus === 'due') {
      return {
        priority: options.isOverdue ? 2 : 3,
        label: options.isOverdue
          ? 'Commission overdue — pay Ambassador'
          : 'Commission owed — pay Ambassador',
        tone: options.isOverdue ? 'danger' : 'action',
      }
    }
    if (options.commissionStatus === 'paid') {
      return {
        priority: 40,
        label: 'Waiting for Ambassador to confirm receipt',
        tone: 'wait',
      }
    }
    if (options.commissionStatus === 'received') {
      return { priority: 50, label: 'Payment confirmed', tone: 'success' }
    }
    return { priority: 35, label: 'Payment confirmed', tone: 'success' }
  }
  // payment_pending
  if (options.hasSubmittedEvidence === true) {
    return { priority: 4, label: 'Payment evidence submitted — action required', tone: 'action' }
  }
  if (options.hasSubmittedEvidence === false) {
    return { priority: 60, label: 'Waiting for Ambassador', tone: 'wait' }
  }
  return { priority: 55, label: 'Open to check payment evidence', tone: 'wait' }
}

export function businessNextAction(options: {
  status: DealStatus
  hasSubmittedEvidence: boolean
  commissionStatus?: string | null
  isOverdue?: boolean
}): { title: string; body: string } {
  if (options.status === 'cancelled') {
    return {
      title: 'Deal cancelled',
      body: 'This Deal is closed. No commission liability was created.',
    }
  }
  if (options.status === 'completed') {
    return {
      title: 'Deal completed',
      body: 'The Ambassador confirmed commission receipt. No further action is required.',
    }
  }
  if (options.status === 'sealed') {
    if (options.isOverdue) {
      return {
        title: 'Commission overdue',
        body: 'Pay the Ambassador directly, then record that commission was paid when you have settled.',
      }
    }
    if (options.commissionStatus === 'due') {
      return {
        title: 'Commission owed to Ambassador',
        body: 'The Deal is sealed. Pay the Ambassador directly — MarcatursHub does not transfer this commission.',
      }
    }
    if (options.commissionStatus === 'paid') {
      return {
        title: 'Waiting for Ambassador receipt',
        body: 'You marked commission as paid. The Ambassador confirms receipt to complete the Deal.',
      }
    }
    return {
      title: 'Payment confirmed',
      body: 'Customer payment is sealed. Track commission until the Ambassador confirms receipt.',
    }
  }
  if (options.hasSubmittedEvidence) {
    return {
      title: 'Check the customer’s payment',
      body: 'Review submitted evidence. Confirm only when the customer paid your business and the transaction qualifies.',
    }
  }
  return {
    title: 'Waiting for Ambassador',
    body: 'No submitted payment evidence yet. The Ambassador shares Official Payment details and submits proof after the customer pays you.',
  }
}

export function rejectionReasonFromEvents(
  events: Deal['events'] | undefined,
  evidenceId: number,
): string | null {
  if (!events?.length) return null
  for (const event of [...events].reverse()) {
    if (event.type !== 'payment_rejected') continue
    const meta = event.metadata
    if (!meta || typeof meta !== 'object') continue
    const record = meta as { payment_evidence_id?: number; reason?: string }
    if (record.payment_evidence_id === evidenceId && record.reason) {
      return String(record.reason)
    }
  }
  return null
}

export function hasSubmittedEvidence(evidence: PaymentEvidence[]): boolean {
  return evidence.some((item) => item.status === 'submitted')
}
