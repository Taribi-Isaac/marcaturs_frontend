import { apiRequest, apiRequestResult } from '@/shared/api/client'
import type { AppNotification } from './types'

export async function fetchNotifications(page = 1, perPage = 20, signal?: AbortSignal) {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  const result = await apiRequestResult<AppNotification[]>(`/notifications?${qs}`, {
    method: 'GET',
    signal,
  })
  return {
    items: result.data,
    pagination: result.meta?.pagination,
  }
}

export async function fetchNotification(id: string, signal?: AbortSignal) {
  return apiRequest<AppNotification>(`/notifications/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  })
}

export async function markNotificationRead(id: string) {
  return apiRequest<AppNotification>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  })
}
