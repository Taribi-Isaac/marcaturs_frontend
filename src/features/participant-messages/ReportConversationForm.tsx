import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { reportConversation } from './api'
import { conversationKeys } from './queryKeys'

type Props = {
  conversationId: number
  alreadyReported: boolean
}

export function ReportConversationForm({ conversationId, alreadyReported }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(alreadyReported)

  const mutation = useMutation({
    mutationFn: () => reportConversation(conversationId, reason.trim()),
    onSuccess: async (conversation) => {
      setDone(true)
      setOpen(false)
      setReason('')
      setError(null)
      queryClient.setQueryData(conversationKeys.detail(conversationId), conversation)
      await queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          setDone(true)
          setError('This conversation has already been reported.')
          void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) })
          return
        }
        setError(err.message)
        return
      }
      setError('Could not submit the report.')
    },
  })

  if (done || alreadyReported) {
    return (
      <p className="chat-report-status" role="status">
        This conversation has been reported for moderation review.
      </p>
    )
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Report conversation
      </Button>
    )
  }

  return (
    <form
      className="stack chat-report"
      onSubmit={(event) => {
        event.preventDefault()
        if (!reason.trim()) {
          setError('A reason is required.')
          return
        }
        mutation.mutate()
      }}
    >
      <div>
        <h3 className="chat-report__title">Report conversation</h3>
        <p className="form-section__lead">
          Reporting opens a moderation case for Admin review. It does not automatically punish or
          suspend anyone.
        </p>
      </div>
      <div className="field">
        <label htmlFor={`report-reason-${conversationId}`}>Reason</label>
        <textarea
          id={`report-reason-${conversationId}`}
          rows={3}
          value={reason}
          maxLength={2000}
          required
          disabled={mutation.isPending}
          onChange={(event) => {
            setReason(event.target.value)
            if (error) setError(null)
          }}
        />
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="desk-toolbar">
        <Button type="submit" size="sm" disabled={mutation.isPending || !reason.trim()}>
          {mutation.isPending ? 'Submitting…' : 'Submit report'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
