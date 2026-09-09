import type { ChatMessage } from './types'

/** Authoritative identity is server message `id`. */
export function mergeMessagesById(
  existing: ChatMessage[],
  incoming: ChatMessage | ChatMessage[],
): ChatMessage[] {
  const map = new Map<number, ChatMessage>()
  for (const message of existing) {
    map.set(message.id, message)
  }
  const batch = Array.isArray(incoming) ? incoming : [incoming]
  for (const message of batch) {
    if (typeof message.id !== 'number') continue
    map.set(message.id, message)
  }
  return Array.from(map.values()).sort((a, b) => a.id - b.id)
}

export function isChatMessagePayload(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'number' &&
    typeof record.conversation_id === 'number' &&
    typeof record.sender_id === 'number' &&
    typeof record.content === 'string' &&
    record.type === 'text'
  )
}
