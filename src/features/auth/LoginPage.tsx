import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { GuestOnly } from '@/features/auth/RequireAuth'
import { useAuth } from '@/features/auth/authContext'
import { homePathForRole } from '@/features/auth/authHelpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const emailVerifiedNotice = searchParams.get('email_verified') === '1'
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <GuestOnly>
      <PageMeta title="Sign in" description="Sign in to MarcatursHub." />
      <div className="auth-panel">
        <h1>Sign in</h1>
        <p className="auth-panel__lead">Access your Business or Ambassador workspace.</p>
        {emailVerifiedNotice ? (
          <div className="alert alert--info" role="status" style={{ marginBottom: '1rem' }}>
            Your email is verified. Sign in to continue.
          </div>
        ) : null}
        {formError ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: '1rem' }}>
            {formError}
          </div>
        ) : null}
        <form
          className="stack"
          onSubmit={form.handleSubmit(async (values) => {
            setFormError(null)
            try {
              const user = await login(values)
              const from = (location.state as { from?: string } | null)?.from
              const next = new URLSearchParams(location.search).get('next')
              const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
              navigate(
                from && from.startsWith('/app') ? from : safeNext || homePathForRole(user.role),
                { replace: true },
              )
            } catch (error) {
              if (error instanceof ApiClientError) {
                setFormError(error.message)
              } else {
                setFormError('Sign in failed. Try again.')
              }
            }
          })}
        >
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="field__error">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="field__error">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </GuestOnly>
  )
}
