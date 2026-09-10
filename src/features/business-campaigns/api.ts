import { apiRequest } from '@/shared/api/client'
import { appConfig } from '@/app/config/env'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'
import type {
  BusinessCampaign,
  CampaignVersion,
  CampaignVersionInput,
  CategorySummary,
  FeaturedStatus,
  FeePackage,
  MarketingResource,
  MarketingResourceType,
  PaymentInitializeResult,
} from './types'

export async function fetchCategories(signal?: AbortSignal) {
  return apiRequest<CategorySummary[]>('/categories', { method: 'GET', signal })
}

export async function fetchBusinessCampaigns(signal?: AbortSignal) {
  return apiRequest<BusinessCampaign[]>('/campaigns', { method: 'GET', signal })
}

export async function fetchBusinessCampaign(id: number, signal?: AbortSignal) {
  return apiRequest<BusinessCampaign>(`/campaigns/${id}`, { method: 'GET', signal })
}

export async function createCampaign(payload: { title: string; category_id: number }) {
  return apiRequest<BusinessCampaign>('/campaigns', { method: 'POST', body: payload })
}

export async function updateCampaign(
  id: number,
  payload: Partial<{ title: string; category_id: number }>,
) {
  return apiRequest<BusinessCampaign>(`/campaigns/${id}`, { method: 'PATCH', body: payload })
}

export async function submitCampaign(id: number) {
  return apiRequest<BusinessCampaign>(`/campaigns/${id}/submit`, { method: 'POST' })
}

export async function deactivateCampaign(id: number) {
  return apiRequest<BusinessCampaign>(`/campaigns/${id}/deactivate`, { method: 'POST' })
}

export async function fetchCampaignVersions(campaignId: number, signal?: AbortSignal) {
  return apiRequest<CampaignVersion[]>(`/campaigns/${campaignId}/versions`, {
    method: 'GET',
    signal,
  })
}

export async function fetchCampaignVersion(
  campaignId: number,
  versionNumber: number,
  signal?: AbortSignal,
) {
  return apiRequest<CampaignVersion>(`/campaigns/${campaignId}/versions/${versionNumber}`, {
    method: 'GET',
    signal,
  })
}

export async function createCampaignVersion(
  campaignId: number,
  payload: CampaignVersionInput = {},
) {
  return apiRequest<CampaignVersion>(`/campaigns/${campaignId}/versions`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateCampaignVersion(
  campaignId: number,
  versionNumber: number,
  payload: CampaignVersionInput,
) {
  return apiRequest<CampaignVersion>(`/campaigns/${campaignId}/versions/${versionNumber}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function publishCampaignVersion(campaignId: number, versionNumber: number) {
  return apiRequest<CampaignVersion>(`/campaigns/${campaignId}/versions/${versionNumber}/publish`, {
    method: 'POST',
  })
}

export async function fetchMarketingResources(campaignId: number, signal?: AbortSignal) {
  return apiRequest<MarketingResource[]>(`/campaigns/${campaignId}/resources`, {
    method: 'GET',
    signal,
  })
}

export async function createMarketingResource(
  campaignId: number,
  form: {
    type: MarketingResourceType
    title: string
    description?: string
    sort_order?: number
    file: File
  },
) {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('type', form.type)
  body.append('title', form.title)
  if (form.description) body.append('description', form.description)
  if (form.sort_order !== undefined) body.append('sort_order', String(form.sort_order))
  body.append('file', form.file)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(`${appConfig.apiBaseUrl}/campaigns/${campaignId}/resources`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })
  const payload = (await response.json()) as {
    success: boolean
    data?: MarketingResource
    error?: { message: string; code: string; details?: unknown }
  }
  if (!response.ok || !payload.success || !payload.data) {
    const { ApiClientError } = await import('@/shared/api/errors')
    const { mapHttpStatusToCode } = await import('@/shared/api/errors')
    throw new ApiClientError({
      code: (payload.error?.code as never) || mapHttpStatusToCode(response.status),
      message: payload.error?.message || 'Upload failed.',
      status: response.status,
      details: payload.error?.details,
    })
  }
  return payload.data
}

export async function deleteMarketingResource(campaignId: number, resourceId: number) {
  return apiRequest<null>(`/campaigns/${campaignId}/resources/${resourceId}`, {
    method: 'DELETE',
  })
}

export async function fetchCampaignCover(campaignId: number, signal?: AbortSignal) {
  return apiRequest<import('@/features/marketplace/cover').CampaignCoverImage>(
    `/campaigns/${campaignId}/cover`,
    { method: 'GET', signal },
  )
}

export async function uploadCampaignCover(campaignId: number, file: File) {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('file', file)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const xsrf = readXsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  const response = await fetch(`${appConfig.apiBaseUrl}/campaigns/${campaignId}/cover`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })
  const payload = (await response.json()) as {
    success: boolean
    data?: import('@/features/marketplace/cover').CampaignCoverImage
    error?: { message: string; code: string; details?: unknown }
  }
  if (!response.ok || !payload.success || !payload.data) {
    const { ApiClientError, mapHttpStatusToCode } = await import('@/shared/api/errors')
    throw new ApiClientError({
      code: (payload.error?.code as never) || mapHttpStatusToCode(response.status),
      message: payload.error?.message || 'Cover upload failed.',
      status: response.status,
      details: payload.error?.details,
    })
  }
  return payload.data
}

export async function deleteCampaignCover(campaignId: number) {
  return apiRequest<null>(`/campaigns/${campaignId}/cover`, { method: 'DELETE' })
}

export function campaignCoverDownloadUrl(campaignId: number) {
  return `${appConfig.apiBaseUrl}/campaigns/${campaignId}/cover/download`
}

export function marketingResourceDownloadUrl(campaignId: number, resourceId: number) {
  return `${appConfig.apiBaseUrl}/campaigns/${campaignId}/resources/${resourceId}/download`
}

export async function fetchExtensionPackages(campaignId: number, signal?: AbortSignal) {
  return apiRequest<FeePackage[]>(`/campaigns/${campaignId}/extension-packages`, {
    method: 'GET',
    signal,
  })
}

export async function initializeExtension(campaignId: number, packageId: number) {
  return apiRequest<PaymentInitializeResult>(`/campaigns/${campaignId}/extensions/initialize`, {
    method: 'POST',
    body: { package_id: packageId },
  })
}

export async function fetchFeaturedPackages(signal?: AbortSignal) {
  return apiRequest<FeePackage[]>('/campaign-featured/packages', { method: 'GET', signal })
}

export async function fetchFeaturedStatus(campaignId: number, signal?: AbortSignal) {
  return apiRequest<FeaturedStatus>(`/campaigns/${campaignId}/featured`, {
    method: 'GET',
    signal,
  })
}

export async function initializeFeatured(campaignId: number, packageId: number) {
  return apiRequest<PaymentInitializeResult>(`/campaigns/${campaignId}/featured/initialize`, {
    method: 'POST',
    body: { package_id: packageId },
  })
}
