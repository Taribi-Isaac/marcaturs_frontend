export const businessDealKeys = {
  all: ['business-deals'] as const,
  list: (page?: number) => [...businessDealKeys.all, 'list', page ?? 1] as const,
  detail: (id: number) => [...businessDealKeys.all, 'detail', id] as const,
  evidence: (id: number) => [...businessDealKeys.all, 'evidence', id] as const,
}

export const businessCommissionKeys = {
  all: ['business-commissions'] as const,
  list: () => [...businessCommissionKeys.all, 'list'] as const,
  detail: (id: number) => [...businessCommissionKeys.all, 'detail', id] as const,
}
