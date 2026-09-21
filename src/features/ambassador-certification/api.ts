import { appConfig } from '@/app/config/env'
import { apiRequest } from '@/shared/api/client'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'
import type {
  AssessmentAttempt,
  CertificationCertificate,
  CertificationEnrollment,
  CertificationProgramme,
  EnrollmentCurriculum,
  LearnerAssessment,
  PurchaseInitializeResult,
} from './types'

export async function fetchProgrammes(signal?: AbortSignal) {
  return apiRequest<CertificationProgramme[]>('/certification/programmes', { signal })
}

export async function fetchProgramme(programmeId: number, signal?: AbortSignal) {
  return apiRequest<CertificationProgramme>(`/certification/programmes/${programmeId}`, {
    signal,
  })
}

export async function initializePurchase(programmeId: number) {
  return apiRequest<PurchaseInitializeResult>(
    `/certification/programmes/${programmeId}/purchase/initialize`,
    { method: 'POST' },
  )
}

export async function verifyPurchase(reference: string) {
  return apiRequest<CertificationEnrollment>('/certification/purchases/verify', {
    method: 'POST',
    body: { reference },
  })
}

export async function fetchEnrollments(signal?: AbortSignal) {
  return apiRequest<CertificationEnrollment[]>('/certification/enrollments', { signal })
}

export async function fetchEnrollment(enrollmentId: number, signal?: AbortSignal) {
  return apiRequest<CertificationEnrollment>(`/certification/enrollments/${enrollmentId}`, {
    signal,
  })
}

export async function fetchCurriculum(enrollmentId: number, signal?: AbortSignal) {
  return apiRequest<EnrollmentCurriculum>(
    `/certification/enrollments/${enrollmentId}/curriculum`,
    { signal },
  )
}

export async function completeLesson(enrollmentId: number, lessonId: number) {
  return apiRequest<{
    status: string
    started_at: string | null
    completed_at: string | null
  }>(`/certification/enrollments/${enrollmentId}/lessons/${lessonId}/complete`, {
    method: 'POST',
  })
}

export function lessonResourceDownloadUrl(
  enrollmentId: number,
  lessonId: number,
  resourceId: number,
) {
  return `${appConfig.apiBaseUrl}/certification/enrollments/${enrollmentId}/lessons/${lessonId}/resources/${resourceId}/download`
}

export async function fetchAssessment(enrollmentId: number, signal?: AbortSignal) {
  return apiRequest<LearnerAssessment>(
    `/certification/enrollments/${enrollmentId}/assessment`,
    { signal },
  )
}

export async function fetchAttempts(enrollmentId: number, signal?: AbortSignal) {
  return apiRequest<AssessmentAttempt[]>(
    `/certification/enrollments/${enrollmentId}/assessment/attempts`,
    { signal },
  )
}

export async function startAttempt(enrollmentId: number) {
  return apiRequest<AssessmentAttempt>(
    `/certification/enrollments/${enrollmentId}/assessment/attempts`,
    { method: 'POST' },
  )
}

export async function submitAttempt(
  enrollmentId: number,
  attemptId: number,
  answers: Array<{ question_id: number; selected_option_id: number }>,
) {
  return apiRequest<AssessmentAttempt>(
    `/certification/enrollments/${enrollmentId}/assessment/attempts/${attemptId}/submit`,
    { method: 'POST', body: { answers } },
  )
}

export async function fetchCertificates(signal?: AbortSignal) {
  return apiRequest<CertificationCertificate[]>('/certification/certificates', { signal })
}

export async function fetchCertificate(certificateId: number, signal?: AbortSignal) {
  return apiRequest<CertificationCertificate>(`/certification/certificates/${certificateId}`, {
    signal,
  })
}

export function certificateDownloadUrl(certificateId: number) {
  return `${appConfig.apiBaseUrl}/certification/certificates/${certificateId}/download`
}

/** Authenticated blob download — never exposes storage keys. */
export async function downloadAuthenticatedFile(url: string, fallbackName: string) {
  await ensureCsrfCookie()
  const headers: Record<string, string> = {
    Accept: '*/*',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(url, { credentials: 'include', headers })
  if (!response.ok) {
    const err = new Error(
      response.status === 409
        ? 'The certificate file is not ready yet. Please try again shortly.'
        : 'Download failed.',
    )
    ;(err as Error & { status?: number }).status = response.status
    throw err
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || fallbackName
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export const PURCHASE_REFERENCE_KEY = 'mh_cert_purchase_reference'

export function rememberPurchaseReference(reference: string) {
  try {
    sessionStorage.setItem(PURCHASE_REFERENCE_KEY, reference)
  } catch {
    // ignore storage failures
  }
}

export function readRememberedPurchaseReference(): string | null {
  try {
    return sessionStorage.getItem(PURCHASE_REFERENCE_KEY)
  } catch {
    return null
  }
}

export function clearRememberedPurchaseReference() {
  try {
    sessionStorage.removeItem(PURCHASE_REFERENCE_KEY)
  } catch {
    // ignore
  }
}
