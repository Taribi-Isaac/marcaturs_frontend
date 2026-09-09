import { apiRequest, apiRequestResult } from '@/shared/api/client'
import type { Conversation, ChatMessage, OpenConversationPayload } from './types'

export async function fetchConversations(page = 1, perPage = 20, signal?: AbortSignal) {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const result = await apiRequestResult<Conversation[]>(`/conversations?${qs}`, {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchConversation(id: number, signal?: AbortSignal) {
  return apiRequest<Conversation>(`/conversations/${id}`, {
    method: 'GET',
    signal,
  })
}

export async function openConversation(payload: OpenConversationPayload) {
  return apiRequestResult<Conversation>('/conversations', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchMessages(
  conversationId: number,
  page = 1,
  perPage = 100,
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const result = await apiRequestResult<ChatMessage[]>(
    `/conversations/${conversationId}/messages?${qs}`,
    { method: 'GET', signal },
  )
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

/**
 * Load the newest page of messages (API orders by id ascending).
 * Returns messages in chronological order plus pagination for "load earlier".
 */
export async function fetchLatestMessages(
  conversationId: number,
  perPage = 100,
  signal?: AbortSignal,
) {
  const first = await fetchMessages(conversationId, 1, perPage, signal)
  const lastPage = first.pagination?.last_page ?? 1
  if (lastPage <= 1) {
    return {
      items: first.items,
      pagination: first.pagination,
      loadedPage: 1,
    }
  }
  const latest = await fetchMessages(conversationId, lastPage, perPage, signal)
  return {
    items: latest.items,
    pagination: latest.pagination,
    loadedPage: lastPage,
  }
}

export async function sendMessage(conversationId: number, content: string) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
  })
}

export async function markConversationRead(conversationId: number) {
  return apiRequest<{ updated: number }>(`/conversations/${conversationId}/read`, {
    method: 'POST',
  })
}

export async function reportConversation(conversationId: number, reason: string) {
  return apiRequest<Conversation>(`/conversations/${conversationId}/report`, {
    method: 'POST',
    body: { reason },
  })
}
