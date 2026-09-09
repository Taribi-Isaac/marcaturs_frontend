import { appConfig } from '@/app/config/env'
import { apiRequest, apiRequestResult } from '@/shared/api/client'
import type { Deal, PaymentEvidence } from '@/features/ambassador-deals/types'

export type CommissionListItem = {
  id: number
  status: 'due' | 'paid' | 'received'
  deal_id: number
  amount: string | number
  currency: string
  due_at: string | null
  paid_at: string | null
  received_at: string | null
  is_overdue: boolean
  payment_reference?: string | null
  payment_note?: string | null
}

export async function fetchBusinessDeals(page = 1, perPage = 50, signal?: AbortSignal) {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const result = await apiRequestResult<Deal[]>(`/deals?${qs}`, {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchBusinessDeal(id: number, signal?: AbortSignal) {
  return apiRequest<Deal>(`/deals/${id}`, { method: 'GET', signal })
}

export async function fetchDealEvidence(dealId: number, signal?: AbortSignal) {
  return apiRequest<PaymentEvidence[]>(`/deals/${dealId}/payment-evidence`, {
    method: 'GET',
    signal,
  })
}

export function evidenceDownloadUrl(dealId: number, evidenceId: number) {
  return `${appConfig.apiBaseUrl}/deals/${dealId}/payment-evidence/${evidenceId}/download`
}

export async function confirmDeal(
  dealId: number,
  payload: { confirmed_payment_amount?: number | string | null } = {},
) {
  const body: Record<string, unknown> = {}
  if (
    payload.confirmed_payment_amount !== undefined &&
    payload.confirmed_payment_amount !== null &&
    payload.confirmed_payment_amount !== ''
  ) {
    body.confirmed_payment_amount = payload.confirmed_payment_amount
  }
  return apiRequest<Deal>(`/deals/${dealId}/confirm`, {
    method: 'POST',
    body,
  })
}

export async function rejectPaymentEvidence(dealId: number, evidenceId: number, reason: string) {
  return apiRequest<PaymentEvidence>(`/deals/${dealId}/payment-evidence/${evidenceId}/reject`, {
    method: 'POST',
    body: { reason },
  })
}

export async function cancelBusinessDeal(dealId: number, reason: string) {
  return apiRequest<Deal>(`/deals/${dealId}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}

export async function fetchBusinessCommissions(signal?: AbortSignal) {
  const result = await apiRequestResult<CommissionListItem[]>('/commissions', {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function markCommissionPaid(
  commissionId: number,
  payload: { payment_reference?: string; payment_note?: string } = {},
) {
  return apiRequest<CommissionListItem>(`/commissions/${commissionId}/mark-paid`, {
    method: 'POST',
    body: payload,
  })
}
