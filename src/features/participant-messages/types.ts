export type ConversationCounterpart = {
  id: number
  name: string
  role: 'BUSINESS' | 'AMBASSADOR'
}

export type Conversation = {
  id: number
  counterpart: ConversationCounterpart | null
  reported: boolean
  created_at: string | null
  updated_at: string | null
}

export type ChatMessage = {
  id: number
  conversation_id: number
  sender_id: number
  type: 'text'
  content: string
  read_at: string | null
  created_at: string | null
}

export type OpenConversationPayload =
  | { ambassador_id: number }
  | { business_id: number }
  | { campaign_id: number }

export const CHAT_MESSAGE_MAX_CHARS = 5000
