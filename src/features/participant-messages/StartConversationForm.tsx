import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { UserRole } from '@/shared/types/auth'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { openConversation } from './api'
import { conversationKeys } from './queryKeys'

type Props = {
  role: Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>
  onOpened: (conversationId: number) => void
  initialCounterpartId?: string
}

export function StartConversationForm({ role, onOpened, initialCounterpartId = '' }: Props) {
  const queryClient = useQueryClient()
  const [counterpartId, setCounterpartId] = useState(initialCounterpartId)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const id = Number(counterpartId)
      if (!Number.isInteger(id) || id <= 0) {
        throw new ApiClientError({
          code: 'validation_error',
          message: 'Enter a valid counterpart user id.',
          status: 422,
        })
      }
      if (role === 'BUSINESS') {
        return openConversation({ ambassador_id: id })
      }
      return openConversation({ business_id: id })
    },
    onSuccess: async (result) => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      onOpened(result.data.id)
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setError(err.message)
        return
      }
      setError('Could not open the conversation.')
    },
  })

  const counterpartLabel = role === 'BUSINESS' ? 'Ambassador user id' : 'Business user id'

  return (
    <form
      className="stack chat-start"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <div>
        <h2>Start or reopen a conversation</h2>
        <p className="form-section__lead">
          Chat is a Business↔Ambassador relationship. Opening the same pair returns the existing
          conversation — it is not tied to a Deal or Campaign.
        </p>
      </div>
      <div className="field">
        <label htmlFor="counterpart-id">{counterpartLabel}</label>
        <input
          id="counterpart-id"
          inputMode="numeric"
          value={counterpartId}
          disabled={mutation.isPending}
          onChange={(event) => {
            setCounterpartId(event.target.value)
            if (error) setError(null)
          }}
        />
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={mutation.isPending || !counterpartId.trim()}>
        {mutation.isPending ? 'Opening…' : 'Open conversation'}
      </Button>
    </form>
  )
}
