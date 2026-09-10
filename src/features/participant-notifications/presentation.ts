import { formatDateTime, formatMoney } from '@/features/ambassador-deals/format'
import type { UserRole } from '@/shared/types/auth'
import type { AppNotification, NotificationPayload, NotificationType } from './types'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'remember_token',
  'idempotency_key',
  'storage_path',
  'disk',
  'path',
  'payment_account_identifier',
  'payment_instructions',
  'payment_contact',
  'bank_account',
  'signed_url',
])

export function notificationTypeLabel(type: NotificationType | null): string {
  switch (type) {
    case 'commission_due':
      return 'Commission due'
    case 'commission_pre_deadline':
      return 'Commission reminder'
    case 'commission_deadline':
      return 'Commission deadline'
    case 'commission_overdue':
      return 'Commission overdue'
    case 'commission_overdue_follow_up':
      return 'Commission overdue follow-up'
    case 'commission_paid':
      return 'Commission paid'
    case 'commission_received':
      return 'Commission received'
    case 'dispute_opened':
      return 'Dispute opened'
    case 'dispute_resolved':
      return 'Dispute resolved'
    case 'deal_cancelled':
      return 'Deal cancelled'
    case 'campaign_featured_purchased':
      return 'Featured campaign'
    case 'account_status_changed':
      return 'Account status'
    case 'test':
      return 'System notice'
    default:
      return type ? type.replaceAll('_', ' ') : 'Notification'
  }
}

export function notificationTitle(notification: AppNotification): string {
  const data = notification.data || {}
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim()

  switch (notification.type) {
    case 'commission_due':
      return 'Commission is due'
    case 'commission_pre_deadline':
      return 'Commission deadline approaching'
    case 'commission_deadline':
      return 'Commission deadline today'
    case 'commission_overdue':
      return 'Commission payment overdue'
    case 'commission_overdue_follow_up':
      return 'Commission still overdue'
    case 'commission_paid':
      return 'Commission marked paid'
    case 'commission_received':
      return 'Commission receipt confirmed'
    case 'dispute_opened':
      return 'Dispute opened'
    case 'dispute_resolved':
      return 'Dispute resolved'
    case 'deal_cancelled':
      return 'Deal cancelled'
    case 'campaign_featured_purchased':
      return 'Featured visibility activated'
    case 'account_status_changed':
      return 'Account status updated'
    default:
      return notificationTypeLabel(notification.type)
  }
}

export function notificationBody(notification: AppNotification, role: UserRole): string {
  const data = notification.data || {}
  if (typeof data.body === 'string' && data.body.trim()) return data.body.trim()
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()

  const dealId = asPositiveInt(data.deal_id)
  const disputeRef = typeof data.reference === 'string' ? data.reference : null
  const amount =
    data.amount != null
      ? formatMoney(data.amount as string | number, (data.currency as string) || 'NGN')
      : null
  const campaignTitle =
    data.campaign && typeof data.campaign === 'object' && data.campaign !== null
      ? String((data.campaign as { title?: unknown }).title || '')
      : typeof data.package_name === 'string'
        ? data.package_name
        : null

  switch (notification.type) {
    case 'commission_due':
      return role === 'BUSINESS'
        ? `A commission is now due${dealId ? ` for Deal #${dealId}` : ''}${amount ? ` (${amount})` : ''}. Pay the Ambassador directly — MarcatursHub does not transfer this commission.`
        : `A commission is due${dealId ? ` for Deal #${dealId}` : ''}${amount ? ` (${amount})` : ''}. The Business pays you directly.`
    case 'commission_pre_deadline':
      return `A commission payment deadline is approaching${dealId ? ` for Deal #${dealId}` : ''}.`
    case 'commission_deadline':
      return `A commission payment is due today${dealId ? ` for Deal #${dealId}` : ''}.`
    case 'commission_overdue':
    case 'commission_overdue_follow_up':
      return role === 'BUSINESS'
        ? `A commission payment is overdue${dealId ? ` for Deal #${dealId}` : ''}. Pay the Ambassador directly outside MarcatursHub.`
        : `A commission payment is overdue${dealId ? ` for Deal #${dealId}` : ''}.`
    case 'commission_paid':
      return `The Business marked commission as paid${dealId ? ` for Deal #${dealId}` : ''}.`
    case 'commission_received':
      return `The Ambassador confirmed commission receipt${dealId ? ` for Deal #${dealId}` : ''}.`
    case 'dispute_opened':
      return `A dispute${disputeRef ? ` (${disputeRef})` : ''} has been opened${dealId ? ` on Deal #${dealId}` : ''}. This is a separate review case and does not rename the Deal status.`
    case 'dispute_resolved':
      return `Dispute${disputeRef ? ` ${disputeRef}` : ''}${dealId ? ` on Deal #${dealId}` : ''} has been resolved.`
    case 'deal_cancelled':
      return `Deal #${dealId ?? '—'} has been cancelled.`
    case 'campaign_featured_purchased':
      return `Featured visibility is now active${campaignTitle ? ` for ${campaignTitle}` : ' for your campaign'}.`
    case 'account_status_changed':
      return 'Your account status has been updated by MarcatursHub administration.'
    case 'test':
      return typeof data.title === 'string' ? data.title : 'System test notification.'
    default:
      return 'There is an update for your MarcatursHub account.'
  }
}

export type NotificationDeepLink = {
  to: string
  label: string
}

export function notificationDeepLink(
  notification: AppNotification,
  role: UserRole,
): NotificationDeepLink | null {
  const data = notification.data || {}
  const base = role === 'BUSINESS' ? '/app/business' : '/app/ambassador'

  const disputeId = asPositiveInt(data.dispute_id)
  if (disputeId) {
    return { to: `${base}/disputes/${disputeId}`, label: 'Open dispute' }
  }

  const dealId = asPositiveInt(data.deal_id)
  if (dealId) {
    return { to: `${base}/deals/${dealId}`, label: 'Open Deal' }
  }

  const campaignId = asPositiveInt(data.campaign_id)
  if (campaignId && role === 'BUSINESS') {
    return { to: `${base}/campaigns/${campaignId}`, label: 'Open campaign' }
  }

  if (notification.type === 'account_status_changed') {
    return { to: `${base}/settings`, label: 'Open settings' }
  }

  // Commission-only without deal_id: Business commissions desk is not yet a full vertical —
  // route to Deals where commission actions already live. Ambassadors use Earnings.
  const commissionId = asPositiveInt(data.commission_id)
  if (commissionId) {
    if (role === 'BUSINESS') {
      return { to: `${base}/deals`, label: 'Open Deals' }
    }
    return { to: `${base}/earnings`, label: 'Open earnings' }
  }

  return null
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const minutes = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (minutes < 60) return rtf.format(Math.sign(diffMs) * Math.max(minutes, 1), 'minute')
  if (hours < 48) return rtf.format(Math.sign(diffMs) * hours, 'hour')
  if (days < 30) return rtf.format(Math.sign(diffMs) * days, 'day')
  return formatDateTime(value)
}

export function safeDetailRows(data: NotificationPayload): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return
    if (typeof value === 'object') return
    rows.push({ label, value: String(value) })
  }

  push('Deal', asPositiveInt(data.deal_id) ? `#${asPositiveInt(data.deal_id)}` : null)
  push(
    'Dispute',
    typeof data.reference === 'string'
      ? data.reference
      : asPositiveInt(data.dispute_id)
        ? `#${asPositiveInt(data.dispute_id)}`
        : null,
  )
  push(
    'Commission',
    asPositiveInt(data.commission_id) ? `#${asPositiveInt(data.commission_id)}` : null,
  )
  if (data.amount != null) {
    push('Amount', formatMoney(data.amount as string | number, (data.currency as string) || 'NGN'))
  }
  push('Status', typeof data.status === 'string' ? data.status.replaceAll('_', ' ') : null)
  push('Due', typeof data.due_at === 'string' ? formatDateTime(data.due_at) : null)
  push('Days remaining', data.days_remaining)
  push('Days overdue', data.days_overdue)
  push('Package', typeof data.package_name === 'string' ? data.package_name : null)
  push('Expires', typeof data.expires_at === 'string' ? formatDateTime(data.expires_at) : null)
  push(
    'Campaign',
    data.campaign && typeof data.campaign === 'object' && data.campaign !== null
      ? String((data.campaign as { title?: unknown }).title || '')
      : null,
  )

  // Never dump sensitive keys even if present
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.has(key)) continue
  }

  return rows
}

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}
