import type { ApiErrorCode } from './envelope'

export class ApiClientError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details: unknown

  constructor(options: { code: ApiErrorCode; message: string; status: number; details?: unknown }) {
    super(options.message)
    this.name = 'ApiClientError'
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

export function mapHttpStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'validation_error'
    case 401:
      return 'unauthenticated'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 422:
      return 'business_validation'
    case 429:
      return 'rate_limited'
    case 503:
      return 'service_unavailable'
    default:
      if (status >= 500) {
        return 'server_error'
      }
      return 'unknown_error'
  }
}
