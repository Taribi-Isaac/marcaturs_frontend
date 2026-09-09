export const dealKeys = {
  all: ['deals'] as const,
  list: () => [...dealKeys.all, 'list'] as const,
  detail: (id: number) => [...dealKeys.all, 'detail', id] as const,
  evidence: (id: number) => [...dealKeys.all, 'evidence', id] as const,
}

export const officialPaymentKeys = {
  byToken: (token: string) => ['official-payment', token] as const,
}
