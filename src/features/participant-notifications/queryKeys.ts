export const notificationKeys = {
  all: ['participant-notifications'] as const,
  list: (page = 1) => [...notificationKeys.all, 'list', page] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
}
