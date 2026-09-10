import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { ApiClientError } from '@/shared/api/errors'
import type { UserRole } from '@/shared/types/auth'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchNotifications, markNotificationRead } from './api'
import {
  notificationBody,
  notificationDeepLink,
  notificationTitle,
  notificationTypeLabel,
  relativeTime,
  safeDetailRows,
} from './presentation'
import { notificationKeys } from './queryKeys'
import type { AppNotification } from './types'

export function ParticipantNotificationsPage({ role }: { role: UserRole }) {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || '1') || 1
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: ({ signal }) => fetchNotifications(page, 20, signal),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setActionError(error.message)
        if (error.status === 409) {
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        }
        return
      }
      setActionError('Could not update this notification.')
    },
  })

  const lastPage = list.data?.pagination?.last_page ?? 1
  const items = list.data?.items ?? []

  const activate = (notification: AppNotification) => {
    setExpandedId((current) => (current === notification.id ? null : notification.id))
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
  }

  return (
    <>
      <PageMeta
        title="Notifications"
        description="Important Deal, commission, dispute and account updates."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Notifications</h1>
            <p>
              Important Deal, commission, dispute and account updates appear here. Notifications are
              informational — MarcatursHub does not hold customer payments or transfer commission.
            </p>
          </div>
        </header>

        {actionError ? <div className="alert alert--danger">{actionError}</div> : null}

        <section className="card stack">
          <div>
            <h2>Inbox</h2>
            <p className="form-section__lead">
              Newest first. Unread items are marked clearly and become read when you open them.
            </p>
          </div>

          {list.isLoading ? <LoadingState label="Loading notifications…" /> : null}

          {list.isError ? (
            <ErrorState
              title={
                list.error instanceof ApiClientError && list.error.status === 403
                  ? 'Notifications unavailable'
                  : 'Could not load notifications'
              }
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void list.refetch()}
              >
                Retry
              </Button>
            </ErrorState>
          ) : null}

          {list.isSuccess && items.length === 0 ? (
            <EmptyState title="You're all caught up">
              No notifications right now. Deal, commission, verification, and account updates will
              appear here when something needs your attention.
            </EmptyState>
          ) : null}

          {items.length > 0 ? (
            <ul className="notification-list" aria-label="Notifications">
              {items.map((notification) => {
                const expanded = expandedId === notification.id
                const deepLink = notificationDeepLink(notification, role)
                const rows = safeDetailRows(notification.data || {})
                return (
                  <li
                    key={notification.id}
                    className={[
                      'notification-item',
                      notification.is_read ? 'is-read' : 'is-unread',
                      expanded ? 'is-expanded' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className="notification-item__trigger"
                      aria-expanded={expanded}
                      onClick={() => activate(notification)}
                    >
                      <div className="notification-item__top">
                        <div className="notification-item__meta">
                          {!notification.is_read ? (
                            <span className="notification-unread-marker">Unread</span>
                          ) : (
                            <span className="badge badge--neutral">Read</span>
                          )}
                          <span className="badge">{notificationTypeLabel(notification.type)}</span>
                        </div>
                        <time
                          dateTime={notification.created_at || undefined}
                          title={formatDateTime(notification.created_at)}
                        >
                          {relativeTime(notification.created_at)}
                        </time>
                      </div>
                      <strong className="notification-item__title">
                        {notificationTitle(notification)}
                      </strong>
                      <p className="notification-item__body">
                        {notificationBody(notification, role)}
                      </p>
                      <span className="campaign-row__meta">
                        Exact time: {formatDateTime(notification.created_at)}
                      </span>
                    </button>

                    {expanded ? (
                      <div className="notification-item__detail stack">
                        {rows.length > 0 ? (
                          <dl className="snapshot-grid">
                            {rows.map((row) => (
                              <div key={row.label}>
                                <dt>{row.label}</dt>
                                <dd>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                        <div className="action-bar">
                          {deepLink ? (
                            <ButtonLink to={deepLink.to} size="sm">
                              {deepLink.label}
                            </ButtonLink>
                          ) : null}
                          {!notification.is_read ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={markRead.isPending}
                              onClick={() => markRead.mutate(notification.id)}
                            >
                              Mark as read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {list.isSuccess && lastPage > 1 ? (
            <div className="action-bar">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('page', String(Math.max(1, page - 1)))
                    return next
                  })
                }
              >
                Previous
              </Button>
              <span className="campaign-row__meta">
                Page {page} of {lastPage}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('page', String(page + 1))
                    return next
                  })
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>

        <p className="campaign-row__meta">
          Looking for Deals or disputes?{' '}
          <Link to={role === 'BUSINESS' ? '/app/business/deals' : '/app/ambassador/deals'}>
            Open Deals
          </Link>
          {' · '}
          <Link to={role === 'BUSINESS' ? '/app/business/disputes' : '/app/ambassador/disputes'}>
            Open disputes
          </Link>
        </p>
      </div>
    </>
  )
}
