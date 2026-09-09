import { appConfig } from '@/app/config/env'
import type { ApiEnvelope, ApiSuccessEnvelope } from './envelope'
import { ApiClientError, mapHttpStatusToCode } from './errors'
import { ensureCsrfCookie, readXsrfToken } from './csrf'
import { notifyUnauthorized } from './sessionEvents'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  credentials?: RequestCredentials
  skipCsrf?: boolean
  notifyOnUnauthorized?: boolean
}

export type ApiRequestResult<T> = {
  data: T
  meta?: ApiSuccessEnvelope<T>['meta']
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await apiRequestResult<T>(path, options)
  return result.data
}

export async function apiRequestResult<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiRequestResult<T>> {
  const method = options.method ?? 'GET'
  const notifyOnUnauthorized = options.notifyOnUnauthorized ?? true

  if (!options.skipCsrf && isMutatingMethod(method)) {
    await ensureCsrfCookie()
  }

  const url = joinUrl(appConfig.apiBaseUrl, path)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  }

  const xsrf = readXsrfToken()
  if (xsrf) {
    headers['X-XSRF-TOKEN'] = xsrf
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: options.signal,
      credentials: options.credentials ?? 'include',
    })
  } catch {
    throw new ApiClientError({
      code: 'network_error',
      message: 'Unable to reach the MarcatursHub API.',
      status: 0,
    })
  }

  const payload = (await parseJsonSafe(response)) as ApiEnvelope<T> | null

  if (!response.ok) {
    if (response.status === 401 && notifyOnUnauthorized) {
      notifyUnauthorized()
    }

    if (payload && payload.success === false) {
      throw new ApiClientError({
        code: normalizeErrorCode(payload.error.code, response.status),
        message: payload.error.message || 'Request failed.',
        status: response.status,
        details: payload.error.details,
      })
    }

    throw new ApiClientError({
      code: mapHttpStatusToCode(response.status),
      message: 'Request failed.',
      status: response.status,
    })
  }

  if (!payload || payload.success !== true) {
    throw new ApiClientError({
      code: 'unknown_error',
      message: 'Unexpected API response shape.',
      status: response.status,
      details: payload,
    })
  }

  return {
    data: payload.data,
    meta: payload.meta,
  }
}

function isMutatingMethod(method: HttpMethod): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function normalizeErrorCode(code: string, status: number) {
  const known = [
    'validation_error',
    'unauthenticated',
    'forbidden',
    'not_found',
    'conflict',
    'business_validation',
    'rate_limited',
    'server_error',
    'service_unavailable',
    'network_error',
    'unknown_error',
  ] as const

  if ((known as readonly string[]).includes(code)) {
    return code as (typeof known)[number]
  }

  return mapHttpStatusToCode(status)
}

function joinUrl(base: string, path: string): string {
  if (base.startsWith('http://') || base.startsWith('https://')) {
    const normalizedBase = base.replace(/\/+$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${normalizedBase}${normalizedPath}`
  }

  const normalizedBase = base.startsWith('/')
    ? base.replace(/\/+$/, '')
    : `/${base.replace(/\/+$/, '')}`
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}
