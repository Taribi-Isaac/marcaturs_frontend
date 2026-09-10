import type { Deal } from '@/features/ambassador-deals/types'
import type { CommissionListItem } from '@/features/business-deals/api'
import type { BusinessCampaign, CampaignStatus } from '@/features/business-campaigns/types'
import type { Dispute, DisputeStatus } from '@/features/participant-disputes/types'
import type { AppNotification, NotificationType } from '@/features/participant-notifications/types'
import { formatMoney } from '@/features/ambassador-deals/format'
import { overdueDurationLabel } from '@/features/business-commissions/format'
import { notificationTitle } from '@/features/participant-notifications/presentation'

/**
 * Dashboard attention priority (deterministic buckets):
 * 1. Overdue commissions
 * 2. Open disputes
 * 3. Deals requiring Business action (payment_pending — evidence review / confirmation path)
 * 4. Due commissions (not overdue)
 * 5. Campaigns requiring Business action (draft / expiring)
 * 6. Important unread notifications (is_read === false only; never fabricated counts)
 *
 * Commission overdue/due items are not duplicated as Deal attention.
 * Open disputes are sourced from the disputes API, not Deal.has_open_dispute alone.
 */

export type AttentionTone = 'action' | 'danger' | 'wait' | 'neutral'

export type AttentionKind =
  | 'overdue_commission'
  | 'open_dispute'
  | 'deal_action'
  | 'due_commission'
  | 'campaign_action'
  | 'unread_notification'

export type AttentionItem = {
  id: string
  kind: AttentionKind
  /** Primary bucket 1–6 (lower = higher urgency). */
  priority: number
  /** Stable secondary sort (lower first). */
  sortWithin: number
  tone: AttentionTone
  label: string
  title: string
  detail: string
  href: string
  cta: string
}

const OPEN_DISPUTE_STATUSES: DisputeStatus[] = [
  'submitted',
  'under_review',
  'evidence_requested',
  'decision_pending',
]

const IMPORTANT_NOTIFICATION_TYPES = new Set<NotificationType>([
  'commission_overdue',
  'commission_overdue_follow_up',
  'commission_deadline',
  'commission_due',
  'commission_pre_deadline',
  'dispute_opened',
  'dispute_resolved',
  'deal_cancelled',
  'account_status_changed',
])

const CAMPAIGN_ACTION_STATUSES: CampaignStatus[] = ['draft', 'expiring']

export function isOpenDisputeStatus(status: DisputeStatus): boolean {
  return OPEN_DISPUTE_STATUSES.includes(status)
}

export function isImportantUnreadNotification(notification: AppNotification): boolean {
  if (notification.is_read) return false
  if (!notification.type) return false
  return IMPORTANT_NOTIFICATION_TYPES.has(notification.type)
}

export function isDealRequiringBusinessAction(deal: Deal): boolean {
  return deal.status === 'payment_pending'
}

export function isCampaignRequiringBusinessAction(campaign: BusinessCampaign): boolean {
  return CAMPAIGN_ACTION_STATUSES.includes(campaign.status)
}

function commissionTitle(item: CommissionListItem, dealsById: Map<number, Deal>): string {
  const deal = dealsById.get(item.deal_id)
  const product = deal?.product_name || deal?.campaign.title
  if (product) return product
  return `Commission #${item.id}`
}

function commissionDetail(item: CommissionListItem, dealsById: Map<number, Deal>): string {
  const deal = dealsById.get(item.deal_id)
  const amount = formatMoney(item.amount, item.currency)
  const ambassador = deal?.ambassador.name ? ` · ${deal.ambassador.name}` : ''
  if (item.status === 'due' && item.is_overdue) {
    const overdue = overdueDurationLabel(item.due_at)
    return `${amount}${ambassador}${overdue ? ` · ${overdue}` : ''}`
  }
  if (item.due_at) {
    return `${amount}${ambassador} · Due ${item.due_at.slice(0, 10)}`
  }
  return `${amount}${ambassador}`
}

export function buildAttentionItems(input: {
  commissions?: CommissionListItem[] | null
  deals?: Deal[] | null
  disputes?: Dispute[] | null
  campaigns?: BusinessCampaign[] | null
  notifications?: AppNotification[] | null
}): AttentionItem[] {
  const dealsById = new Map((input.deals ?? []).map((deal) => [deal.id, deal]))
  const items: AttentionItem[] = []

  for (const commission of input.commissions ?? []) {
    if (commission.status !== 'due') continue
    if (commission.is_overdue) {
      items.push({
        id: `overdue-commission-${commission.id}`,
        kind: 'overdue_commission',
        priority: 1,
        sortWithin: commission.id,
        tone: 'danger',
        label: 'Overdue commission',
        title: commissionTitle(commission, dealsById),
        detail: commissionDetail(commission, dealsById),
        href: `/app/business/commissions/${commission.id}`,
        cta: 'Review commission',
      })
    } else {
      items.push({
        id: `due-commission-${commission.id}`,
        kind: 'due_commission',
        priority: 4,
        sortWithin: commission.id,
        tone: 'action',
        label: 'Commission due',
        title: commissionTitle(commission, dealsById),
        detail: commissionDetail(commission, dealsById),
        href: `/app/business/commissions/${commission.id}`,
        cta: 'Review commission',
      })
    }
  }

  for (const dispute of input.disputes ?? []) {
    if (!isOpenDisputeStatus(dispute.status)) continue
    items.push({
      id: `open-dispute-${dispute.id}`,
      kind: 'open_dispute',
      priority: 2,
      sortWithin: dispute.id,
      tone: dispute.status === 'evidence_requested' ? 'action' : 'wait',
      label: 'Open dispute',
      title: dispute.reference || `Dispute #${dispute.id}`,
      detail: `Deal #${dispute.deal_id} · ${dispute.status.replaceAll('_', ' ')}`,
      href: `/app/business/disputes/${dispute.id}`,
      cta: 'View dispute',
    })
  }

  for (const deal of input.deals ?? []) {
    if (!isDealRequiringBusinessAction(deal)) continue
    items.push({
      id: `deal-action-${deal.id}`,
      kind: 'deal_action',
      priority: 3,
      sortWithin: deal.id,
      tone: 'action',
      label: 'Deal needs review',
      title: deal.product_name || deal.campaign.title,
      detail: `${deal.ambassador.name || 'Ambassador'} · Check payment evidence and confirm only if it qualifies`,
      href: `/app/business/deals/${deal.id}`,
      cta: 'Review Deal',
    })
  }

  for (const campaign of input.campaigns ?? []) {
    if (!isCampaignRequiringBusinessAction(campaign)) continue
    if (campaign.status === 'draft') {
      items.push({
        id: `campaign-draft-${campaign.id}`,
        kind: 'campaign_action',
        priority: 5,
        sortWithin: campaign.id,
        tone: 'action',
        label: 'Campaign draft',
        title: campaign.title,
        detail: 'Publish commercial terms, then submit for review when ready.',
        href: `/app/business/campaigns/${campaign.id}`,
        cta: 'Open campaign',
      })
    } else if (campaign.status === 'expiring') {
      items.push({
        id: `campaign-expiring-${campaign.id}`,
        kind: 'campaign_action',
        priority: 5,
        sortWithin: campaign.id,
        tone: 'wait',
        label: 'Listing expiring',
        title: campaign.title,
        detail: 'The marketplace window is ending. Extend if you want to stay discoverable.',
        href: `/app/business/campaigns/${campaign.id}`,
        cta: 'Open campaign',
      })
    }
  }

  for (const notification of input.notifications ?? []) {
    if (!isImportantUnreadNotification(notification)) continue
    items.push({
      id: `notification-${notification.id}`,
      kind: 'unread_notification',
      priority: 6,
      sortWithin: notification.created_at ? Date.parse(notification.created_at) || 0 : 0,
      tone: 'wait',
      label: 'Unread notice',
      title: notificationTitle(notification),
      detail: notification.type ? notification.type.replaceAll('_', ' ') : 'Notification',
      href: '/app/business/notifications',
      cta: 'View notifications',
    })
  }

  return items.sort(
    (a, b) => a.priority - b.priority || a.sortWithin - b.sortWithin || a.id.localeCompare(b.id),
  )
}

export function summarizeCampaigns(campaigns: BusinessCampaign[]) {
  return {
    active: campaigns.filter((c) => c.status === 'active').length,
    submitted: campaigns.filter((c) => c.status === 'submitted').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    expiring: campaigns.filter((c) => c.status === 'expiring').length,
    total: campaigns.length,
  }
}

export function summarizeCommissionObligations(commissions: CommissionListItem[]) {
  return {
    overdue: commissions.filter((c) => c.status === 'due' && c.is_overdue).length,
    due: commissions.filter((c) => c.status === 'due' && !c.is_overdue).length,
    awaitingReceipt: commissions.filter((c) => c.status === 'paid').length,
    received: commissions.filter((c) => c.status === 'received').length,
  }
}
