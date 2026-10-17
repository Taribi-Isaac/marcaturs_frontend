import { ApiClientError } from '@/shared/api/errors'

export const REGISTER_API_FIELDS = [
  'name',
  'email',
  'password',
  'password_confirmation',
  'role',
] as const

export type RegisterApiField = (typeof REGISTER_API_FIELDS)[number]

/**
 * Maps allow-listed registration validation `details` onto field → first message.
 * Ignores unknown keys and malformed values. Auth-local — does not import campaigns.
 */
export function registerFieldErrorsFromApi(
  error: unknown,
): Partial<Record<RegisterApiField, string>> {
  if (!(error instanceof ApiClientError) || error.code !== 'validation_error') {
    return {}
  }
  if (!error.details || typeof error.details !== 'object' || Array.isArray(error.details)) {
    return {}
  }

  const out: Partial<Record<RegisterApiField, string>> = {}
  for (const [key, value] of Object.entries(error.details as Record<string, unknown>)) {
    if (!(REGISTER_API_FIELDS as readonly string[]).includes(key)) continue
    const field = key as RegisterApiField
    if (Array.isArray(value) && value.length > 0 && value[0] != null && value[0] !== '') {
      out[field] = String(value[0])
    } else if (typeof value === 'string' && value.trim() !== '') {
      out[field] = value
    }
  }
  return out
}
