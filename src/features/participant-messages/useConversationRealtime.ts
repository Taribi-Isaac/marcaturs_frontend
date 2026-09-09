import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getEchoClient, isRealtimeConfigured, type RealtimeStatus } from './echoClient'
import { isChatMessagePayload, mergeMessagesById } from './mergeMessages'
import { conversationKeys } from './queryKeys'
import type { ChatMessage } from './types'

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

/**
 * Subscribe to private `conversation.{id}` for `message.created`.
 * Deduplicates by message id against the REST cache.
 */
export function useConversationRealtime(conversationId: number | null) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>(() => {
    if (conversationId == null) return isRealtimeConfigured() ? 'idle' : 'unavailable'
    return isRealtimeConfigured() ? 'connecting' : 'unavailable'
  })
  const subscribedId = useRef<number | null>(null)

  useEffect(() => {
    if (conversationId == null || !isRealtimeConfigured()) {
      return
    }

    const echo = getEchoClient()
    if (!echo) {
      queueMicrotask(() => setStatus('unavailable'))
      return
    }

    queueMicrotask(() => setStatus('connecting'))
    subscribedId.current = conversationId

    const connector = echo.connector as {
      pusher?: {
        connection?: {
          bind: (event: string, cb: () => void) => void
          unbind: (event: string, cb?: () => void) => void
          state?: string
        }
      }
    }

    const connection = connector.pusher?.connection
    const onConnected = () => setStatus('connected')
    const onUnavailable = () => setStatus('unavailable')
    const onFailed = () => setStatus('unavailable')
    const onDisconnected = () => setStatus('unavailable')

    const onMessageCreated = (payload: unknown) => {
      if (!isChatMessagePayload(payload)) return
      if (payload.conversation_id !== conversationId) return

      queryClient.setQueryData<MessagesCache>(
        conversationKeys.messages(conversationId),
        (current) => {
          const items = mergeMessagesById(current?.items ?? [], payload)
          return {
            items,
            pagination: current?.pagination,
            loadedPage: current?.loadedPage ?? 1,
          }
        },
      )

      void queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    }

    const channelName = `conversation.${conversationId}`

    try {
      if (connection) {
        connection.bind('connected', onConnected)
        connection.bind('unavailable', onUnavailable)
        connection.bind('failed', onFailed)
        connection.bind('disconnected', onDisconnected)
        if (connection.state === 'connected') {
          queueMicrotask(() => setStatus('connected'))
        }
      }

      const channel = echo.private(channelName)
      channel.listen('.message.created', onMessageCreated)

      return () => {
        channel.stopListening('.message.created', onMessageCreated)
        echo.leave(channelName)
        if (connection) {
          connection.unbind('connected', onConnected)
          connection.unbind('unavailable', onUnavailable)
          connection.unbind('failed', onFailed)
          connection.unbind('disconnected', onDisconnected)
        }
        if (subscribedId.current === conversationId) {
          subscribedId.current = null
        }
      }
    } catch {
      queueMicrotask(() => setStatus('unavailable'))
      return () => {
        if (subscribedId.current === conversationId) {
          subscribedId.current = null
        }
      }
    }
  }, [conversationId, queryClient])

  const resolvedStatus: RealtimeStatus =
    conversationId == null
      ? isRealtimeConfigured()
        ? 'idle'
        : 'unavailable'
      : !isRealtimeConfigured()
        ? 'unavailable'
        : status === 'idle'
          ? 'connecting'
          : status

  return { status: resolvedStatus }
}
