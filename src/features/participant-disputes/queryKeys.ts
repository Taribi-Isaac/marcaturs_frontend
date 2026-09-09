export const disputeKeys = {
  all: ['participant-disputes'] as const,
  categories: () => [...disputeKeys.all, 'categories'] as const,
  list: (page = 1) => [...disputeKeys.all, 'list', page] as const,
  detail: (id: number) => [...disputeKeys.all, 'detail', id] as const,
}
