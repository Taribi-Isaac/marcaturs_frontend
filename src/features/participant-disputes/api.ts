import { appConfig } from '@/app/config/env'
import { apiRequest, apiRequestResult } from '@/shared/api/client'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'
import { ApiClientError, mapHttpStatusToCode } from '@/shared/api/errors'
import type { Dispute, DisputeAttachment, DisputeCategory } from './types'

export async function fetchDisputeCategories(signal?: AbortSignal) {
  return apiRequest<DisputeCategory[]>('/dispute-categories', {
    method: 'GET',
    signal,
  })
}

export async function fetchDisputes(page = 1, signal?: AbortSignal) {
  const result = await apiRequestResult<Dispute[]>(`/disputes?page=${page}`, {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchDispute(id: number, signal?: AbortSignal) {
  return apiRequest<Dispute>(`/disputes/${id}`, { method: 'GET', signal })
}

export async function createDispute(
  dealId: number,
  payload: { category_id: number; description: string },
) {
  return apiRequest<Dispute>(`/deals/${dealId}/disputes`, {
    method: 'POST',
    body: payload,
  })
}

export async function uploadDisputeAttachment(
  disputeId: number,
  form: { file: File; note?: string },
) {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('file', form.file)
  if (form.note) body.append('note', form.note)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(`${appConfig.apiBaseUrl}/disputes/${disputeId}/attachments`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })
  const payload = (await response.json()) as {
    success: boolean
    data?: DisputeAttachment
    error?: { message: string; code: string; details?: unknown }
  }
  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiClientError({
      code: (payload.error?.code as never) || mapHttpStatusToCode(response.status),
      message: payload.error?.message || 'Attachment upload failed.',
      status: response.status,
      details: payload.error?.details,
    })
  }
  return payload.data
}

export function disputeAttachmentDownloadUrl(disputeId: number, attachmentId: number) {
  return `${appConfig.apiBaseUrl}/disputes/${disputeId}/attachments/${attachmentId}/download`
}
