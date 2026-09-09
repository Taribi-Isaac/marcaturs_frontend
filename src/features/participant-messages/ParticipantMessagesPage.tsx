import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { ApiClientError } from '@/shared/api/errors'
import type { UserRole } from '@/shared/types/auth'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchConversations, openConversation } from './api'
import { ConversationThread } from './ConversationThread'
import { conversationKeys } from './queryKeys'
import { StartConversationForm } from './StartConversationForm'

type ParticipantRole = Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>

export function ParticipantMessagesPage({ role }: { role: ParticipantRole }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const conversationIdParam = params.conversationId
  const conversationId = conversationIdParam ? Number(conversationIdParam) : null
  const page = Number(searchParams.get('page') || '1') || 1
  const withCounterpart = searchParams.get('with')
  const openAttempted = useRef<string | null>(null)

  const basePath = role === 'BUSINESS' ? '/app/business/messages' : '/app/ambassador/messages'
  const selectedId =
    conversationId != null && Number.isInteger(conversationId) && conversationId > 0
      ? conversationId
      : null
  const hasThread = selectedId != null

  const list = useQuery({
    queryKey: conversationKeys.list(page),
    queryFn: ({ signal }) => fetchConversations(page, 20, signal),
  })

  const openWith = useMutation({
    mutationFn: async (counterpartId: number) => {
      if (role === 'BUSINESS') {
        return openConversation({ ambassador_id: counterpartId })
      }
      return openConversation({ business_id: counterpartId })
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      navigate(`${basePath}/${result.data.id}`, { replace: true })
    },
  })

  useEffect(() => {
    if (!withCounterpart) {
      openAttempted.current = null
      return
    }
    if (openAttempted.current === withCounterpart) return
    openAttempted.current = withCounterpart

    const id = Number(withCounterpart)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('with')
        return next
      },
      { replace: true },
    )

    if (!Number.isInteger(id) || id <= 0) return
    openWith.mutate(id)
    // Intentionally depend only on the deep-link param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCounterpart])

  const lastPage = list.data?.pagination?.last_page ?? 1
  const items = list.data?.items ?? []
  const openError =
    openWith.error instanceof ApiClientError
      ? openWith.error.message
      : openWith.isError
        ? 'Could not open the conversation.'
        : null

  return (
    <>
      <PageMeta
        title="Messages"
        description="Business ↔ Ambassador conversations for commercial coordination."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Messages</h1>
            <p>
              Direct conversation with your {role === 'BUSINESS' ? 'Ambassadors' : 'Businesses'}.
              Chat is independent of Deals and Campaigns — one conversation per relationship.
            </p>
          </div>
        </header>

        {openError ? <div className="alert alert--danger">{openError}</div> : null}
        {openWith.isPending ? <LoadingState label="Opening conversation…" /> : null}

        <div className={`chat-layout${hasThread ? ' chat-layout--thread' : ' chat-layout--list'}`}>
          <section
            className={`chat-inbox card stack${hasThread ? ' chat-inbox--desktop-only' : ''}`}
            aria-label="Conversation list"
          >
            <div>
              <h2>Inbox</h2>
              <p className="form-section__lead">
                Ordered by most recently updated. Conversation identity and counterpart only —
                message previews appear when the API exposes them.
              </p>
            </div>

            {list.isLoading ? <LoadingState label="Loading conversations…" /> : null}

            {list.isError ? (
              <ErrorState
                title={
                  list.error instanceof ApiClientError && list.error.status === 403
                    ? 'Messages unavailable'
                    : 'Could not load conversations'
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
              <EmptyState title="No conversations yet">
                Open a conversation with a counterpart to start messaging.
              </EmptyState>
            ) : null}

            {items.length > 0 ? (
              <ul className="chat-conversation-list">
                {items.map((conversation) => {
                  const active = selectedId === conversation.id
                  const name = conversation.counterpart?.name || `Conversation #${conversation.id}`
                  return (
                    <li key={conversation.id}>
                      <Link
                        to={`${basePath}/${conversation.id}`}
                        className={`chat-conversation-item${active ? ' is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <div className="chat-conversation-item__top">
                          <strong>{name}</strong>
                          <time dateTime={conversation.updated_at || undefined}>
                            {formatDateTime(conversation.updated_at)}
                          </time>
                        </div>
                        <p className="chat-conversation-item__meta">
                          {conversation.counterpart?.role === 'BUSINESS'
                            ? 'Business'
                            : conversation.counterpart?.role === 'AMBASSADOR'
                              ? 'Ambassador'
                              : 'Participant'}
                          {conversation.reported ? ' · Reported' : ''}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {lastPage > 1 ? (
              <div className="desk-toolbar" role="navigation" aria-label="Conversation pages">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current)
                      next.set('page', String(page - 1))
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
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current)
                      next.set('page', String(page + 1))
                      return next
                    })
                  }
                >
                  Next
                </Button>
              </div>
            ) : null}

            {!hasThread ? (
              <StartConversationForm role={role} onOpened={(id) => navigate(`${basePath}/${id}`)} />
            ) : null}
          </section>

          <section className={`chat-pane${hasThread ? '' : ' chat-pane--empty'}`}>
            {hasThread ? (
              <div className="card chat-pane__card">
                <ConversationThread
                  role={role}
                  conversationId={selectedId}
                  listPath={basePath}
                  showBackLink
                />
              </div>
            ) : (
              <div className="card chat-pane__empty chat-pane__empty--desktop">
                <EmptyState title="Select a conversation">
                  Choose a conversation from the inbox, or open a new Business↔Ambassador thread.
                </EmptyState>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
