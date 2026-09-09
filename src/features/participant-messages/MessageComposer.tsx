import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { CHAT_MESSAGE_MAX_CHARS } from './types'

type Props = {
  disabled?: boolean
  isSending?: boolean
  onSend: (content: string) => Promise<void>
}

export function MessageComposer({ disabled, isSending, onSend }: Props) {
  const [content, setContent] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const trimmed = content.trim()
  const tooLong = content.length > CHAT_MESSAGE_MAX_CHARS
  const canSend = !disabled && !isSending && !tooLong

  const submit = async () => {
    if (disabled || isSending) return
    if (!trimmed) {
      setLocalError('Enter a message before sending.')
      return
    }
    if (tooLong) {
      setLocalError(`Messages can be at most ${CHAT_MESSAGE_MAX_CHARS} characters.`)
      return
    }

    setLocalError(null)
    try {
      await onSend(trimmed)
      setContent('')
    } catch (error) {
      if (error instanceof ApiClientError) {
        setLocalError(error.message)
        return
      }
      setLocalError('Could not send the message. Try again.')
    }
  }

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label className="visually-hidden" htmlFor="chat-message-input">
        Message
      </label>
      <textarea
        id="chat-message-input"
        className="chat-composer__input"
        rows={3}
        value={content}
        disabled={disabled || isSending}
        maxLength={CHAT_MESSAGE_MAX_CHARS + 50}
        placeholder="Write a message…"
        aria-describedby="chat-composer-hint chat-composer-error"
        onChange={(event) => {
          setContent(event.target.value)
          if (localError) setLocalError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
        }}
      />
      <div className="chat-composer__footer">
        <p id="chat-composer-hint" className="chat-composer__hint">
          Enter to send · Shift+Enter for a new line · {content.length}/{CHAT_MESSAGE_MAX_CHARS}
        </p>
        <Button type="submit" disabled={!canSend} aria-label="Send message">
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {localError ? (
        <p id="chat-composer-error" className="field-error" role="alert">
          {localError}
        </p>
      ) : (
        <span id="chat-composer-error" className="visually-hidden" />
      )}
    </form>
  )
}
