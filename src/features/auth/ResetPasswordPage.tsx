import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPasswordRequest } from '@/features/auth/api'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your new password'),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: 'Passwords must match',
    path: ['password_confirmation'],
  })

type FormValues = z.infer<typeof schema>

function readResetParams(params: URLSearchParams): { email: string; token: string } | null {
  const email = (params.get('email') ?? '').trim()
  const token = (params.get('token') ?? '').trim()
  if (!email || !token) {
    return null
  }
  return { email, token }
}

/**
 * Intentionally not wrapped in GuestOnly: email reset links must work even when
 * a participant already has an active SPA session in the same browser.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const resetParams = useMemo(() => readResetParams(searchParams), [searchParams])
  const [formError, setFormError] = useState<string | null>(null)
  const [invalidLink, setInvalidLink] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  })

  if (!resetParams) {
    return (
      <>
        <PageMeta title="Reset password" description="Reset your MarcatursHub password." />
        <div className="auth-panel">
          <h1>Reset link incomplete</h1>
          <p className="auth-panel__lead">
            This page needs a valid reset link from your email. Request a new link to continue.
          </p>
          <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
            The reset link is missing required information.
          </div>
          <p style={{ fontSize: '0.95rem' }}>
            <Link to="/forgot-password">Request a new password reset</Link>
            {' · '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </>
    )
  }

  if (succeeded) {
    return (
      <>
        <PageMeta title="Password reset" description="Your MarcatursHub password was updated." />
        <div className="auth-panel">
          <h1>Password updated</h1>
          <p className="auth-panel__lead">
            Your password has been reset. Sign in with your new password to continue.
          </p>
          <div className="alert alert--success" role="status" style={{ marginBottom: '1rem' }}>
            Your password has been reset.
          </div>
          <ButtonLink to="/login">Sign in</ButtonLink>
        </div>
      </>
    )
  }

  if (invalidLink) {
    return (
      <>
        <PageMeta title="Reset password" description="Reset your MarcatursHub password." />
        <div className="auth-panel">
          <h1>Reset link unavailable</h1>
          <p className="auth-panel__lead">
            This password reset link is invalid, expired, or has already been used. Request a new
            link to continue.
          </p>
          <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
            This password reset token is invalid.
          </div>
          <p style={{ fontSize: '0.95rem' }}>
            <Link to="/forgot-password">Request a new password reset</Link>
            {' · '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageMeta title="Reset password" description="Choose a new MarcatursHub password." />
      <div className="auth-panel">
        <h1>Choose a new password</h1>
        <p className="auth-panel__lead">
          Set a new password for <strong>{resetParams.email}</strong>. Use at least 8 characters.
        </p>
        {formError ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
            {formError}
          </div>
        ) : null}
        <form
          className="stack"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            setFormError(null)
            try {
              await resetPasswordRequest({
                email: resetParams.email,
                token: resetParams.token,
                password: values.password,
                password_confirmation: values.password_confirmation,
              })
              setSucceeded(true)
              form.reset({ password: '', password_confirmation: '' })
            } catch (error) {
              if (error instanceof ApiClientError) {
                if (error.code === 'business_validation') {
                  setInvalidLink(true)
                  return
                }
                const fields = fieldErrorsFromApi(error)
                if (fields.password) {
                  form.setError('password', { message: fields.password })
                }
                if (fields.password_confirmation) {
                  form.setError('password_confirmation', {
                    message: fields.password_confirmation,
                  })
                }
                const hasFieldError = Boolean(fields.password || fields.password_confirmation)
                if (!hasFieldError) {
                  setFormError(error.message)
                }
                return
              }
              setFormError('Could not reset your password. Try again.')
            }
          })}
        >
          <div className="field">
            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              aria-invalid={form.formState.errors.password ? true : undefined}
              aria-describedby={form.formState.errors.password ? 'reset-password-error' : undefined}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p id="reset-password-error" className="field__error" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="reset-password2">Confirm new password</label>
            <input
              id="reset-password2"
              type="password"
              autoComplete="new-password"
              aria-invalid={form.formState.errors.password_confirmation ? true : undefined}
              aria-describedby={
                form.formState.errors.password_confirmation ? 'reset-password2-error' : undefined
              }
              {...form.register('password_confirmation')}
            />
            {form.formState.errors.password_confirmation ? (
              <p id="reset-password2-error" className="field__error" role="alert">
                {form.formState.errors.password_confirmation.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Updating…' : 'Reset password'}
          </Button>
        </form>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <Link to="/forgot-password">Request a new link</Link>
          {' · '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </>
  )
}
