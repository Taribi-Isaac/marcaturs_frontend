export const businessDealKeys = {
  all: ['business-deals'] as const,
  list: (page?: number) => [...businessDealKeys.all, 'list', page ?? 1] as const,
  detail: (id: number) => [...businessDealKeys.all, 'detail', id] as const,
  evidence: (id: number) => [...businessDealKeys.all, 'evidence', id] as const,
}

export const businessCommissionKeys = {
  list: () => ['business-commissions', 'list'] as const,
}
