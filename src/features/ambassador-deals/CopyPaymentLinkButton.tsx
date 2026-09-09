import { useCallback, useState } from 'react'
import { Button } from '@/shared/ui/Button'

type Props = {
  shareUrl: string | null | undefined
  sharePath: string
  label?: string
}

export function CopyPaymentLinkButton({ shareUrl, sharePath, label = 'Copy payment link' }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const absolute =
    shareUrl ||
    (typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath)

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absolute)
        setFeedback('Link copied')
        return
      }
    } catch {
      // fall through
    }
    window.prompt('Copy this payment link:', absolute)
    setFeedback('Copy the link from the prompt')
  }, [absolute])

  const share = useCallback(async () => {
    if (!navigator.share) {
      await copy()
      return
    }
    try {
      await navigator.share({
        title: 'Official payment information',
        text: 'Pay the business directly using this Official Payment link.',
        url: absolute,
      })
      setFeedback('Shared')
    } catch {
      // user cancelled or share failed
    }
  }, [absolute, copy])

  return (
    <div className="action-bar">
      <Button type="button" onClick={() => void copy()}>
        {label}
      </Button>
      {'share' in navigator ? (
        <Button type="button" variant="secondary" onClick={() => void share()}>
          Share
        </Button>
      ) : null}
      {feedback ? (
        <span role="status" className="copy-feedback">
          {feedback}
        </span>
      ) : null}
    </div>
  )
}
