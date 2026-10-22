import { useLayoutEffect, useRef, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  id: string
  label: string
  autoComplete: string
  error?: string
  registration: UseFormRegisterReturn
  /** Spoken field name, for example "password" or "confirm password". */
  visibilityName: string
}

export function PasswordField({
  id,
  label,
  autoComplete,
  error,
  registration,
  visibilityName,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const { ref, ...inputProps } = registration

  useLayoutEffect(() => {
    const input = inputRef.current
    const selection = selectionRef.current
    if (!input || !selection) return
    input.setSelectionRange(selection.start, selection.end)
    selectionRef.current = null
  }, [visible])

  function toggleVisibility() {
    const input = inputRef.current
    if (input && input.selectionStart != null && input.selectionEnd != null) {
      selectionRef.current = { start: input.selectionStart, end: input.selectionEnd }
    }
    setVisible((current) => !current)
  }

  const action = visible ? 'Hide' : 'Show'

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
          ref={(element) => {
            inputRef.current = element
            ref(element)
          }}
        />
        <button
          type="button"
          className="password-field__toggle"
          aria-pressed={visible}
          aria-label={`${action} ${visibilityName}`}
          onClick={toggleVisibility}
        >
          {visible ? (
            <EyeOff aria-hidden="true" size={18} />
          ) : (
            <Eye aria-hidden="true" size={18} />
          )}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
