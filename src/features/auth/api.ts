import { apiRequest } from '@/shared/api/client'
import type {
  AuthSessionResult,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from '@/shared/types/auth'

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'GET',
    signal,
    notifyOnUnauthorized: false,
  })
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSessionResult> {
  return apiRequest<AuthSessionResult>('/auth/login', {
    method: 'POST',
    body: payload,
    notifyOnUnauthorized: false,
  })
}

export async function registerRequest(payload: RegisterPayload): Promise<AuthSessionResult> {
  return apiRequest<AuthSessionResult>('/auth/register', {
    method: 'POST',
    body: payload,
    notifyOnUnauthorized: false,
  })
}

export async function logoutRequest(): Promise<null> {
  return apiRequest<null>('/auth/logout', {
    method: 'POST',
    notifyOnUnauthorized: false,
  })
}

export async function resendEmailVerificationRequest(): Promise<{
  message: string
  already_verified: boolean
}> {
  return apiRequest<{ message: string; already_verified: boolean }>(
    '/auth/email/verification-notification',
    {
      method: 'POST',
    },
  )
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export async function forgotPasswordRequest(
  payload: ForgotPasswordPayload,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
    notifyOnUnauthorized: false,
  })
}

export async function resetPasswordRequest(
  payload: ResetPasswordPayload,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: payload,
    notifyOnUnauthorized: false,
  })
}
