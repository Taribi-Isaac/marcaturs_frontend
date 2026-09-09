import { apiRequest } from '@/shared/api/client'
import type {
  AmbassadorProfile,
  AmbassadorProfileInput,
  BusinessProfile,
  BusinessProfileInput,
  ChangePasswordInput,
  ChangePasswordResult,
} from './types'

export async function changePassword(payload: ChangePasswordInput) {
  return apiRequest<ChangePasswordResult>('/auth/change-password', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchBusinessProfile(signal?: AbortSignal) {
  return apiRequest<BusinessProfile>('/businesses/me', {
    method: 'GET',
    signal,
  })
}

export async function createBusinessProfile(payload: BusinessProfileInput) {
  return apiRequest<BusinessProfile>('/businesses/me', {
    method: 'POST',
    body: payload,
  })
}

export async function updateBusinessProfile(payload: BusinessProfileInput) {
  return apiRequest<BusinessProfile>('/businesses/me', {
    method: 'PATCH',
    body: payload,
  })
}

export async function fetchAmbassadorProfile(signal?: AbortSignal) {
  return apiRequest<AmbassadorProfile>('/ambassadors/me', {
    method: 'GET',
    signal,
  })
}

export async function createAmbassadorProfile(payload: AmbassadorProfileInput) {
  return apiRequest<AmbassadorProfile>('/ambassadors/me', {
    method: 'POST',
    body: payload,
  })
}

export async function updateAmbassadorProfile(payload: AmbassadorProfileInput) {
  return apiRequest<AmbassadorProfile>('/ambassadors/me', {
    method: 'PATCH',
    body: payload,
  })
}
