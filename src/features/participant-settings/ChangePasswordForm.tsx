import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { changePassword } from './api'

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    password_confirmation: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: 'Password confirmation does not match.',
    path: ['password_confirmation'],
  })
  .refine((values) => values.password !== values.current_password, {
    message: 'The new password must be different from the current password.',
    path: ['password'],
  })

type FormValues = z.infer<typeof schema>

function PasswordField({
  id,
  label,
  error,
  register,
  disabled,
}: {
  id: string
  label: string
  error?: string
  register: ReturnType<typeof useForm<FormValues>>['register']
  disabled?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="settings-password-row">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={id === 'current_password' ? 'current-password' : 'new-password'}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...register(id as keyof FormValues)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => changePassword(values),
    onSuccess: (result) => {
      setFormError(null)
      setSuccess(result.message || 'Your password has been changed.')
      form.reset({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
    },
    onError: (error) => {
      setSuccess(null)
      if (error instanceof ApiClientError) {
        const fields = fieldErrorsFromApi(error)
        if (fields.current_password) {
          form.setError('current_password', { message: fields.current_password })
        }
        if (fields.password) {
          form.setError('password', { message: fields.password })
        }
        if (fields.password_confirmation) {
          form.setError('password_confirmation', { message: fields.password_confirmation })
        }
        const hasFieldError = Boolean(
          fields.current_password || fields.password || fields.password_confirmation,
        )
        setFormError(hasFieldError ? null : error.message)
        if (error.status === 429) {
          setFormError(error.message)
        }
        return
      }
      setFormError('Could not change your password.')
    },
  })

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        setSuccess(null)
        mutation.mutate(values)
      })}
      noValidate
    >
      <p className="form-section__lead">
        Changing your password keeps this session signed in and revokes other personal access tokens
        on your account. MarcatursHub never stores passwords in browser storage.
      </p>

      <PasswordField
        id="current_password"
        label="Current password"
        disabled={mutation.isPending}
        register={form.register}
        error={form.formState.errors.current_password?.message}
      />
      <PasswordField
        id="password"
        label="New password"
        disabled={mutation.isPending}
        register={form.register}
        error={form.formState.errors.password?.message}
      />
      <PasswordField
        id="password_confirmation"
        label="Confirm new password"
        disabled={mutation.isPending}
        register={form.register}
        error={form.formState.errors.password_confirmation?.message}
      />

      {formError ? (
        <div className="alert alert--danger" role="alert">
          {formError}
        </div>
      ) : null}
      {success ? (
        <div className="alert alert--success" role="status">
          {success}
        </div>
      ) : null}

      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  )
}
