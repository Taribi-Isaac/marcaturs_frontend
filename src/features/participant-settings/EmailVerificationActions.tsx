import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resendEmailVerificationRequest } from '@/features/auth/api'
import { AUTH_ME_QUERY_KEY, useAuth } from '@/features/auth/authContext'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'

export function EmailVerificationActions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resend = useMutation({
    mutationFn: () => resendEmailVerificationRequest(),
    onSuccess: async (result) => {
      setError(null)
      setNote(result.message)
      if (result.already_verified) {
        await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY })
      }
    },
    onError: (err) => {
      setNote(null)
      setError(err instanceof ApiClientError ? err.message : 'Could not resend verification email.')
    },
  })

  if (!user || user.email_verified_at) {
    return null
  }

  return (
    <div className="alert alert--info" role="status">
      <p>
        Your email is not verified yet. Check your inbox for the verification link.
      </p>
      <div style={{ marginTop: '0.75rem' }}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
        >
          {resend.isPending ? 'Sending…' : 'Resend verification email'}
        </Button>
      </div>
      {note ? <p className="form-section__lead">{note}</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
