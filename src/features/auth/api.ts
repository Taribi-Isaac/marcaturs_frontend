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
