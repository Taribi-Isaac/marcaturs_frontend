export type NotificationType =
  | 'test'
  | 'commission_due'
  | 'commission_pre_deadline'
  | 'commission_deadline'
  | 'commission_overdue'
  | 'commission_overdue_follow_up'
  | 'commission_paid'
  | 'commission_received'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'deal_cancelled'
  | 'campaign_featured_purchased'
  | 'account_status_changed'
  | string

export type NotificationPayload = Record<string, unknown>

export type AppNotification = {
  id: string
  type: NotificationType | null
  data: NotificationPayload
  is_read: boolean
  read_at: string | null
  created_at: string | null
}
