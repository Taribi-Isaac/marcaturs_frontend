import type { UserRole } from '@/shared/types/auth'

export function homePathForRole(role: UserRole): string {
  if (role === 'BUSINESS') return '/app/business'
  if (role === 'AMBASSADOR') return '/app/ambassador'
  return '/'
}
