import { appConfig } from '@/app/config/env'
import { apiRequest } from '@/shared/api/client'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'
import { ApiClientError, mapHttpStatusToCode } from '@/shared/api/errors'
import type {
  VerificationRequirement,
  VerificationStatusPayload,
  VerificationSubmission,
} from './types'

export async function fetchVerificationStatus(signal?: AbortSignal) {
  return apiRequest<VerificationStatusPayload>('/verification/status', {
    method: 'GET',
    signal,
  })
}

export async function fetchVerificationRequirements(signal?: AbortSignal) {
  return apiRequest<VerificationRequirement[]>('/verification/requirements', {
    method: 'GET',
    signal,
  })
}

type MultipartFields = {
  text_value?: string
  evidence?: File
}

async function postMultipart(
  path: string,
  method: 'POST' | 'PATCH',
  fields: MultipartFields & { requirement_id?: number },
): Promise<VerificationSubmission> {
  await ensureCsrfCookie()
  const body = new FormData()
  if (fields.requirement_id != null) {
    body.append('requirement_id', String(fields.requirement_id))
  }
  if (fields.text_value != null && fields.text_value !== '') {
    body.append('text_value', fields.text_value)
  }
  if (fields.evidence) {
    body.append('evidence', fields.evidence)
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  let response: Response
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method,
      headers,
      body,
      credentials: 'include',
    })
  } catch {
    throw new ApiClientError({
      code: 'network_error',
      message: 'Unable to reach the MarcatursHub API.',
      status: 0,
    })
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean
    data?: VerificationSubmission
    error?: { message?: string; code?: string; details?: unknown }
  } | null

  if (!response.ok || !payload?.success || !payload.data) {
    throw new ApiClientError({
      code: (payload?.error?.code as never) || mapHttpStatusToCode(response.status),
      message: payload?.error?.message || 'Verification submission failed.',
      status: response.status,
      details: payload?.error?.details,
    })
  }

  return payload.data
}

export async function createVerificationSubmission(input: {
  requirement_id: number
  text_value?: string
  evidence?: File
}) {
  return postMultipart('/verification/submissions', 'POST', input)
}

export async function resubmitVerificationSubmission(
  submissionId: number,
  input: { text_value?: string; evidence?: File },
) {
  return postMultipart(`/verification/submissions/${submissionId}`, 'PATCH', input)
}
