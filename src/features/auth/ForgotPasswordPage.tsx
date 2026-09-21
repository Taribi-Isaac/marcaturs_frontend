import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { GuestOnly } from '@/features/auth/RequireAuth'
import { forgotPasswordRequest } from '@/features/auth/api'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  return (
    <GuestOnly>
      <PageMeta title="Forgot password" description="Request a MarcatursHub password reset link." />
      <div className="auth-panel">
        <h1>Forgot password</h1>
        <p className="auth-panel__lead">
          Enter the email for your account. If it is registered, we will send a reset link. For
          security, the response is the same whether or not the address exists.
        </p>

        {successMessage ? (
          <div className="alert alert--success" role="status" style={{ marginBottom: '1rem' }}>
            {successMessage}
          </div>
        ) : null}
        {formError ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
            {formError}
          </div>
        ) : null}

        {!successMessage ? (
          <form
            className="stack"
            noValidate
            onSubmit={form.handleSubmit(async (values) => {
              setFormError(null)
              try {
                const result = await forgotPasswordRequest({
                  email: values.email.trim().toLowerCase(),
                })
                setSuccessMessage(
                  result.message ||
                    'If that email address is registered, a password reset link has been sent.',
                )
                form.reset({ email: '' })
              } catch (error) {
                if (error instanceof ApiClientError) {
                  setFormError(error.message)
                } else {
                  setFormError('Could not send a reset link. Try again.')
                }
              }
            })}
          >
            <div className="field">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={form.formState.errors.email ? true : undefined}
                aria-describedby={form.formState.errors.email ? 'forgot-email-error' : undefined}
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p id="forgot-email-error" className="field__error" role="alert">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
            Check your inbox for the reset email. The link expires after a limited time.
          </p>
        )}

        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </GuestOnly>
  )
}
