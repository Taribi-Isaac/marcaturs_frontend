import type { CommissionListItem } from '@/features/business-deals/api'
import { formatDate, formatMoney } from '@/features/ambassador-deals/format'

export type CommissionFilter = 'all' | 'due' | 'overdue' | 'paid' | 'awaiting_receipt' | 'received'

export function commissionStatusLabel(
  item: Pick<CommissionListItem, 'status' | 'is_overdue'>,
): string {
  if (item.status === 'due' && item.is_overdue) return 'Overdue'
  if (item.status === 'due') return 'Due'
  if (item.status === 'paid') return 'Paid — awaiting receipt'
  if (item.status === 'received') return 'Received'
  return item.status
}

export function commissionStatusBadgeClass(
  item: Pick<CommissionListItem, 'status' | 'is_overdue'>,
): string {
  if (item.status === 'due' && item.is_overdue) return 'badge badge--danger'
  if (item.status === 'due') return 'badge badge--warning'
  if (item.status === 'paid') return 'badge badge--warning'
  if (item.status === 'received') return 'badge badge--success'
  return 'badge badge--neutral'
}

export function overdueDurationLabel(
  dueAt: string | null | undefined,
  now = new Date(),
): string | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime()) || due.getTime() >= now.getTime()) return null
  const days = Math.max(1, Math.floor((now.getTime() - due.getTime()) / 86_400_000))
  return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`
}

export function matchesCommissionFilter(
  item: CommissionListItem,
  filter: CommissionFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'due':
      return item.status === 'due' && !item.is_overdue
    case 'overdue':
      return item.status === 'due' && item.is_overdue
    case 'paid':
    case 'awaiting_receipt':
      return item.status === 'paid'
    case 'received':
      return item.status === 'received'
    default:
      return true
  }
}

export function summarizeCommissions(items: CommissionListItem[]) {
  const dueItems = items.filter((item) => item.status === 'due')
  const overdueItems = dueItems.filter((item) => item.is_overdue)
  const paidItems = items.filter((item) => item.status === 'paid')
  const receivedItems = items.filter((item) => item.status === 'received')

  const sum = (list: CommissionListItem[]) =>
    list.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)

  const currency = items[0]?.currency || 'NGN'

  return {
    dueCount: dueItems.length,
    overdueCount: overdueItems.length,
    paidCount: paidItems.length,
    receivedCount: receivedItems.length,
    dueTotalLabel: formatMoney(sum(dueItems), currency),
    overdueTotalLabel: formatMoney(sum(overdueItems), currency),
    paidTotalLabel: formatMoney(sum(paidItems), currency),
    receivedTotalLabel: formatMoney(sum(receivedItems), currency),
    currency,
  }
}

export function commissionTypeLabel(item: CommissionListItem): string {
  if (item.commission_type === 'percentage' && item.commission_rate != null) {
    return `${item.commission_rate}% of confirmed payment`
  }
  if (item.commission_type === 'fixed') {
    return 'Fixed commission from Deal snapshot'
  }
  return 'Per Deal commission snapshot'
}

export { formatDate, formatMoney }
