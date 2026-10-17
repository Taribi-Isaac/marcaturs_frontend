import { describe, expect, it } from 'vitest'
import { ApiClientError } from '@/shared/api/errors'
import { registerFieldErrorsFromApi } from '@/features/auth/registerFieldErrors'

describe('registerFieldErrorsFromApi (MH-OPS-055)', () => {
  it('maps the first message for allow-listed validation fields', () => {
    const error = new ApiClientError({
      code: 'validation_error',
      message: 'The given data was invalid.',
      status: 400,
      details: {
        email: ['The email has already been taken.', 'second'],
        name: ['The name field is required.'],
      },
    })
    expect(registerFieldErrorsFromApi(error)).toEqual({
      email: 'The email has already been taken.',
      name: 'The name field is required.',
    })
  })

  it('ignores unknown keys and malformed values', () => {
    const error = new ApiClientError({
      code: 'validation_error',
      message: 'The given data was invalid.',
      status: 400,
      details: {
        email: ['Valid email message'],
        is_admin: ['ignored'],
        password: [],
        role: '',
        name: null,
      },
    })
    expect(registerFieldErrorsFromApi(error)).toEqual({
      email: 'Valid email message',
    })
  })

  it('returns empty for non-validation ApiClientError shapes', () => {
    expect(
      registerFieldErrorsFromApi(
        new ApiClientError({
          code: 'rate_limited',
          message: 'Too many attempts.',
          status: 429,
          details: { email: ['should not map'] },
        }),
      ),
    ).toEqual({})
    expect(
      registerFieldErrorsFromApi(
        new ApiClientError({
          code: 'validation_error',
          message: 'The given data was invalid.',
          status: 400,
          details: null,
        }),
      ),
    ).toEqual({})
    expect(registerFieldErrorsFromApi(new Error('boom'))).toEqual({})
  })
})
