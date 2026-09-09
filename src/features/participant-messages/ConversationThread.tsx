import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { useAuth } from '@/features/auth/authContext'
import { ApiClientError } from '@/shared/api/errors'
import type { UserRole } from '@/shared/types/auth'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/States'
import {
  fetchConversation,
  fetchLatestMessages,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from './api'
import { mergeMessagesById } from './mergeMessages'
import { MessageComposer } from './MessageComposer'
import { ReportConversationForm } from './ReportConversationForm'
import { conversationKeys } from './queryKeys'
import type { ChatMessage } from './types'
import { useConversationRealtime } from './useConversationRealtime'
import type { RealtimeStatus } from './echoClient'

type Props = {
  role: Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>
  conversationId: number
  listPath: string
  showBackLink?: boolean
}

type MessagesCache = {
  items: ChatMessage[]
  pagination?: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number | null
    to: number | null
  }
  loadedPage: number
}

function connectionCopy(status: RealtimeStatus): string | null {
  if (status === 'unavailable') {
    return 'Realtime connection unavailable. Messages will still work; refresh may be needed for new messages.'
  }
  if (status === 'connecting') {
    return 'Connecting realtime…'
  }
  return null
}

export function ConversationThread({ role, conversationId, listPath, showBackLink }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const markedRead = useRef<number | null>(null)

  const conversation = useQuery({
    queryKey: conversationKeys.detail(conversationId),
    queryFn: ({ signal }) => fetchConversation(conversationId, signal),
  })

  const messages = useQuery({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: ({ signal }) => fetchLatestMessages(conversationId, 100, signal),
  })

  const { status: realtimeStatus } = useConversationRealtime(
    conversation.isSuccess ? conversationId : null,
  )

  useEffect(() => {
    if (!conversation.isSuccess) return
    if (markedRead.current === conversationId) return
    markedRead.current = conversationId
    void markConversationRead(conversationId).catch(() => {
      /* read state is best-effort */
    })
  }, [conversation.isSuccess, conversationId])

  useEffect(() => {
    const node = bottomRef.current
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'end' })
    }
  }, [messages.data?.items.length])

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(conversationId, content),
    onSuccess: (message) => {
      queryClient.setQueryData<MessagesCache>(
        conversationKeys.messages(conversationId),
        (current) => ({
          items: mergeMessagesById(current?.items ?? [], message),
          pagination: current?.pagination,
          loadedPage: current?.loadedPage ?? 1,
        }),
      )
      void queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) })
    },
  })

  const loadEarlier = useMutation({
    mutationFn: async () => {
      const current = messages.data
      const page = (current?.loadedPage ?? 1) - 1
      if (page < 1) return null
      const earlier = await fetchMessages(
        conversationId,
        page,
        current?.pagination?.per_page ?? 100,
      )
      return { earlier, page }
    },
    onSuccess: (result) => {
      if (!result) return
      queryClient.setQueryData<MessagesCache>(
        conversationKeys.messages(conversationId),
        (current) => ({
          items: mergeMessagesById(current?.items ?? [], result.earlier.items),
          pagination: current?.pagination,
          loadedPage: result.page,
        }),
      )
    },
  })

  if (conversation.isLoading || messages.isLoading) {
    return <LoadingState label="Loading conversation…" />
  }

  if (conversation.isError) {
    const status = conversation.error instanceof ApiClientError ? conversation.error.status : 0
    return (
      <ErrorState
        title={
          status === 403
            ? 'Conversation unavailable'
            : status === 404
              ? 'Conversation not found'
              : 'Could not open conversation'
        }
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void conversation.refetch()}
        >
          Retry
        </Button>
        {showBackLink ? (
          <ButtonLink to={listPath} variant="secondary" size="sm">
            Back to messages
          </ButtonLink>
        ) : null}
      </ErrorState>
    )
  }

  if (messages.isError) {
    const status = messages.error instanceof ApiClientError ? messages.error.status : 0
    return (
      <ErrorState
        title={
          status === 403 || status === 404 ? 'Messages unavailable' : 'Could not load messages'
        }
      >
        <Button type="button" variant="secondary" size="sm" onClick={() => void messages.refetch()}>
          Retry
        </Button>
      </ErrorState>
    )
  }

  if (!conversation.data || !messages.data) {
    return <LoadingState label="Loading conversation…" />
  }

  const counterpart = conversation.data.counterpart
  const items = messages.data.items
  const canLoadEarlier = messages.data.loadedPage > 1
  const connectionNote = connectionCopy(realtimeStatus)
  const reported = conversation.data.reported

  return (
    <div className="chat-thread">
      <header className="chat-thread__header">
        <div className="chat-thread__identity">
          {showBackLink ? (
            <Link className="chat-back" to={listPath}>
              ← Messages
            </Link>
          ) : null}
          <h2>{counterpart?.name || `Conversation #${conversationId}`}</h2>
          <p className="chat-thread__meta">
            {counterpart?.role === 'BUSINESS'
              ? 'Business'
              : counterpart?.role === 'AMBASSADOR'
                ? 'Ambassador'
                : role === 'BUSINESS'
                  ? 'Ambassador'
                  : 'Business'}
            {reported ? ' · Reported' : ''}
          </p>
        </div>
        <ReportConversationForm conversationId={conversationId} alreadyReported={reported} />
      </header>

      {connectionNote ? (
        <p className="chat-realtime-note" role="status">
          {connectionNote}
        </p>
      ) : null}

      <div className="chat-thread__body" aria-live="polite">
        {canLoadEarlier ? (
          <div className="chat-thread__earlier">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loadEarlier.isPending}
              onClick={() => loadEarlier.mutate()}
            >
              {loadEarlier.isPending ? 'Loading…' : 'Load earlier messages'}
            </Button>
          </div>
        ) : null}

        {items.length === 0 ? (
          <EmptyState title="No messages yet">
            Send the first message to start this conversation.
          </EmptyState>
        ) : (
          <ul className="chat-message-list" aria-label="Messages">
            {items.map((message) => {
              const mine = user?.id === message.sender_id
              return (
                <li
                  key={message.id}
                  className={`chat-message${mine ? ' chat-message--mine' : ' chat-message--theirs'}`}
                >
                  <p className="chat-message__content">{message.content}</p>
                  <p className="chat-message__meta">
                    <time dateTime={message.created_at || undefined}>
                      {formatDateTime(message.created_at)}
                    </time>
                    {message.read_at ? (
                      <>
                        {' · '}
                        <span>Read {formatDateTime(message.read_at)}</span>
                      </>
                    ) : null}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        isSending={send.isPending}
        disabled={send.isPending}
        onSend={async (content) => {
          await send.mutateAsync(content)
        }}
      />
    </div>
  )
}
