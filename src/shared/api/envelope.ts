export type PaginationMeta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number | null
  to: number | null
}

export type ApiSuccessEnvelope<T> = {
  success: true
  data: T
  meta?: {
    pagination?: PaginationMeta
  }
}

export type ApiErrorEnvelope = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

export type ApiErrorCode =
  | 'validation_error'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'business_validation'
  | 'rate_limited'
  | 'server_error'
  | 'service_unavailable'
  | 'network_error'
  | 'unknown_error'
