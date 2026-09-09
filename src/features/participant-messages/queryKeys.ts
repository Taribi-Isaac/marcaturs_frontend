export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (page: number) => [...conversationKeys.lists(), page] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: number) => [...conversationKeys.details(), id] as const,
  messages: (id: number) => [...conversationKeys.detail(id), 'messages'] as const,
}
