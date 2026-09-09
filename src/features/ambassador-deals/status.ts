import type { DealStatus } from './types'

export type DealStage = {
  key: string
  label: string
  done: boolean
  current: boolean
}

export function dealStatusLabel(status: DealStatus): string {
  switch (status) {
    case 'payment_pending':
      return 'Payment pending'
    case 'sealed':
      return 'Payment confirmed'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function dealStatusBadgeClass(status: DealStatus): string {
  switch (status) {
    case 'payment_pending':
      return 'badge badge--warning'
    case 'sealed':
      return 'badge badge--success'
    case 'completed':
      return 'badge badge--success'
    case 'cancelled':
      return 'badge badge--neutral'
    default:
      return 'badge badge--neutral'
  }
}

export function dealNextAction(options: {
  status: DealStatus
  hasEvidence: boolean
  commissionStatus?: string | null
  isOverdue?: boolean
}): { title: string; body: string } {
  if (options.status === 'cancelled') {
    return {
      title: 'Deal cancelled',
      body: 'This Deal is closed. No further commercial actions are available.',
    }
  }
  if (options.status === 'payment_pending') {
    if (!options.hasEvidence) {
      return {
        title: 'Share payment details, then submit proof',
        body: 'Send the Official Payment link to your customer. After they pay the Business, submit payment evidence here.',
      }
    }
    return {
      title: 'Waiting for Business confirmation',
      body: 'Evidence is with the Business. Confirmation — not evidence alone — creates commission liability.',
    }
  }
  if (options.status === 'sealed') {
    if (options.commissionStatus === 'due' || options.isOverdue) {
      return {
        title: options.isOverdue ? 'Commission overdue' : 'Commission due',
        body: 'The Business pays you directly. When you receive payment, confirm commission received.',
      }
    }
    if (options.commissionStatus === 'paid') {
      return {
        title: 'Confirm you received commission',
        body: 'The Business marked commission as paid. Confirm receipt to complete the Deal.',
      }
    }
    return {
      title: 'Deal sealed',
      body: 'Payment was confirmed. Track commission until you receive it from the Business.',
    }
  }
  return {
    title: 'Deal completed',
    body: 'You confirmed commission receipt. This commercial journey is finished.',
  }
}

export function buildDealTimeline(options: {
  status: DealStatus
  hasEvidence: boolean
  commissionStatus?: string | null
}): DealStage[] {
  const sealed = options.status === 'sealed' || options.status === 'completed'
  const completed = options.status === 'completed'
  const cancelled = options.status === 'cancelled'
  const evidenceDone = options.hasEvidence || sealed || completed
  const commissionPaid =
    options.commissionStatus === 'paid' || options.commissionStatus === 'received' || completed
  const commissionReceived = options.commissionStatus === 'received' || completed

  if (cancelled) {
    return [
      { key: 'created', label: 'Deal created', done: true, current: false },
      { key: 'cancelled', label: 'Cancelled', done: true, current: true },
    ]
  }

  return [
    {
      key: 'created',
      label: 'Deal created',
      done: true,
      current: options.status === 'payment_pending' && !evidenceDone,
    },
    {
      key: 'evidence',
      label: 'Payment evidence',
      done: evidenceDone,
      current: options.status === 'payment_pending' && evidenceDone,
    },
    {
      key: 'sealed',
      label: 'Business confirmed',
      done: sealed,
      current: sealed && !commissionPaid,
    },
    {
      key: 'paid',
      label: 'Commission paid',
      done: commissionPaid,
      current: sealed && commissionPaid && !commissionReceived,
    },
    {
      key: 'received',
      label: 'Commission received',
      done: commissionReceived,
      current: completed,
    },
  ]
}
