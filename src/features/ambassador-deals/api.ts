import { appConfig } from '@/app/config/env'
import { apiRequest, apiRequestResult } from '@/shared/api/client'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'
import { ApiClientError, mapHttpStatusToCode } from '@/shared/api/errors'
import type { Deal, EvidenceKind, OfficialPaymentInformation, PaymentEvidence } from './types'

export async function fetchDeals(signal?: AbortSignal) {
  const result = await apiRequestResult<Deal[]>('/deals', {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchDeal(id: number, signal?: AbortSignal) {
  return apiRequest<Deal>(`/deals/${id}`, { method: 'GET', signal })
}

export async function createDeal(payload: {
  campaign_id: number
  expected_transaction_amount?: number | null
}) {
  return apiRequest<Deal>('/deals', { method: 'POST', body: payload })
}

export async function cancelDeal(id: number, reason: string) {
  return apiRequest<Deal>(`/deals/${id}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}

export async function fetchPaymentEvidence(dealId: number, signal?: AbortSignal) {
  return apiRequest<PaymentEvidence[]>(`/deals/${dealId}/payment-evidence`, {
    method: 'GET',
    signal,
  })
}

export async function submitPaymentEvidence(
  dealId: number,
  form: {
    kind: EvidenceKind
    reference_number?: string
    amount?: string
    currency?: string
    paid_on?: string
    note?: string
    file?: File | null
  },
) {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('kind', form.kind)
  if (form.reference_number) body.append('reference_number', form.reference_number)
  if (form.amount) body.append('amount', form.amount)
  if (form.currency) body.append('currency', form.currency)
  if (form.paid_on) body.append('paid_on', form.paid_on)
  if (form.note) body.append('note', form.note)
  if (form.file) body.append('file', form.file)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(`${appConfig.apiBaseUrl}/deals/${dealId}/payment-evidence`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })
  const payload = (await response.json()) as {
    success: boolean
    data?: PaymentEvidence
    error?: { message: string; code: string; details?: unknown }
  }
  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiClientError({
      code: (payload.error?.code as never) || mapHttpStatusToCode(response.status),
      message: payload.error?.message || 'Evidence submission failed.',
      status: response.status,
      details: payload.error?.details,
    })
  }
  return payload.data
}

export function evidenceDownloadUrl(dealId: number, evidenceId: number) {
  return `${appConfig.apiBaseUrl}/deals/${dealId}/payment-evidence/${evidenceId}/download`
}

export async function confirmCommissionReceived(commissionId: number) {
  return apiRequest(`/commissions/${commissionId}/confirm-received`, { method: 'POST' })
}

export async function fetchOfficialPaymentInformation(token: string, signal?: AbortSignal) {
  return apiRequest<OfficialPaymentInformation>(
    `/public/official-payment-information/${encodeURIComponent(token)}`,
    {
      method: 'GET',
      signal,
      notifyOnUnauthorized: false,
    },
  )
}

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
}

export async function fetchCommissions(signal?: AbortSignal) {
  const result = await apiRequestResult<CommissionListItem[]>('/commissions', {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export function marketplaceResourceDownloadUrl(campaignId: number, resourceId: number) {
  return `${appConfig.apiBaseUrl}/marketplace/campaigns/${campaignId}/resources/${resourceId}/download`
}
