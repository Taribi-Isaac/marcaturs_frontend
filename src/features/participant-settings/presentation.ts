import type { AuthUser } from '@/shared/types/auth'

export function accountStatusLabel(status: AuthUser['status']): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'restricted':
      return 'Restricted'
    case 'suspended':
      return 'Suspended'
    case 'banned':
      return 'Banned'
    default:
      return status
  }
}

export function accountStatusBadgeClass(status: AuthUser['status']): string {
  switch (status) {
    case 'active':
      return 'badge badge--success'
    case 'restricted':
      return 'badge badge--warning'
    case 'suspended':
    case 'banned':
      return 'badge badge--danger'
    default:
      return 'badge badge--neutral'
  }
}

export function accountStatusExplanation(status: AuthUser['status']): string {
  switch (status) {
    case 'active':
      return 'Your account can use participant features according to your role.'
    case 'restricted':
      return 'Your account is restricted. You can still change your password here. Profile updates may be unavailable until the restriction is lifted.'
    case 'suspended':
      return 'Your account is suspended. Sign-in access to participant tools is limited by MarcatursHub policy.'
    case 'banned':
      return 'Your account is banned. Participant access is not available.'
    default:
      return 'Account status is provided by MarcatursHub.'
  }
}

export function roleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'BUSINESS':
      return 'Business'
    case 'AMBASSADOR':
      return 'Ambassador'
    case 'ADMIN':
      return 'Admin'
    default:
      return role
  }
}

/** Split comma/newline list into trimmed unique tags for skills/interests. */
export function parseTagList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).slice(0, 50)
}

export function formatTagList(values: string[] | null | undefined): string {
  if (!values?.length) return ''
  return values.join(', ')
}
