import { resolveSanctumOrigin } from '@/app/config/env'

export function readXsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  if (!match?.[1]) {
    return null
  }

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export async function ensureCsrfCookie(): Promise<void> {
  const origin = resolveSanctumOrigin()
  const response = await fetch(`${origin}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to initialize the authentication session.')
  }
}
