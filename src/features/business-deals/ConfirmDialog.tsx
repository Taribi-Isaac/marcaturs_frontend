import { useEffect, useId, useRef } from 'react'
import { Button } from '@/shared/ui/Button'

type Props = {
  open: boolean
  title: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  children: React.ReactNode
}

export function ConfirmDialog({
  open,
  title,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('button, [href], input, textarea, select')?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="confirm-dialog" role="presentation">
      <button
        type="button"
        className="confirm-dialog__backdrop"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        className="confirm-dialog__panel card stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="action-bar">
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
