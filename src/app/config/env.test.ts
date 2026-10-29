import { describe, expect, it } from 'vitest'
import { resolveAdminLoginUrl } from '@/app/config/env'

describe('resolveAdminLoginUrl', () => {
  it('builds Admin Control sign-in from an absolute origin', () => {
    expect(resolveAdminLoginUrl('http://localhost:5174')).toBe('http://localhost:5174/login')
    expect(resolveAdminLoginUrl('https://admin.example.test/')).toBe(
      'https://admin.example.test/login',
    )
  })

  it('rejects empty values and anything that is not a bare origin', () => {
    expect(resolveAdminLoginUrl('')).toBeNull()
    expect(resolveAdminLoginUrl('   ')).toBeNull()
    expect(resolveAdminLoginUrl('/login')).toBeNull()
    expect(resolveAdminLoginUrl('javascript:alert(1)')).toBeNull()
    expect(resolveAdminLoginUrl('https://user:secret@admin.example.test')).toBeNull()
    expect(resolveAdminLoginUrl('https://admin.example.test/phish')).toBeNull()
    expect(resolveAdminLoginUrl('https://admin.example.test/?next=https://evil.example')).toBeNull()
  })
})