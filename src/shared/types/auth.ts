export type UserRole = 'ADMIN' | 'BUSINESS' | 'AMBASSADOR'

export type StaffRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'VERIFICATION' | 'MODERATION'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  status: 'active' | 'restricted' | 'suspended' | 'banned'
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string | null
  staff_role?: StaffRole | null
  permissions?: string[]
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: 'BUSINESS' | 'AMBASSADOR'
}

export type AuthSessionResult = {
  user: AuthUser
  token: string
  token_type: 'Bearer'
}
