import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GuestOnly } from '@/features/auth/RequireAuth'
import { useAuth } from '@/features/auth/authContext'
import { homePathForRole } from '@/features/auth/authHelpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

const schema = z
  .object({
    name: z.string().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters'),
    password_confirmation: z.string().min(8, 'Confirm your password'),
    role: z.enum(['BUSINESS', 'AMBASSADOR']),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: 'Passwords must match',
    path: ['password_confirmation'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { register: registerAccount } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const defaultRole = useMemo(() => {
    const role = params.get('role')
    return role === 'BUSINESS' || role === 'AMBASSADOR' ? role : 'AMBASSADOR'
  }, [params])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: defaultRole,
    },
  })

  return (
    <GuestOnly>
      <PageMeta title="Create account" description="Register as a Business or Ambassador." />
      <div className="auth-panel">
        <h1>Create account</h1>
        <p className="auth-panel__lead">
          Join as a Business publishing opportunities, or an Ambassador promoting them. After you
          register, verify your email before using the marketplace workspace.
        </p>
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
              const user = await registerAccount(values)
              navigate(homePathForRole(user.role), { replace: true })
            } catch (error) {
              if (error instanceof ApiClientError) {
                setFormError(error.message)
              } else {
                setFormError('Registration failed. Try again.')
              }
            }
          })}
        >
          <div className="field">
            <label htmlFor="reg-role">I am joining as</label>
            <select id="reg-role" {...form.register('role')}>
              <option value="AMBASSADOR">Ambassador</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="reg-name">Full name</label>
            <input id="reg-name" autoComplete="name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="field__error">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="field__error">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="field__error">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="reg-password2">Confirm password</label>
            <input
              id="reg-password2"
              type="password"
              autoComplete="new-password"
              {...form.register('password_confirmation')}
            />
            {form.formState.errors.password_confirmation ? (
              <p className="field__error">{form.formState.errors.password_confirmation.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </GuestOnly>
  )
}
