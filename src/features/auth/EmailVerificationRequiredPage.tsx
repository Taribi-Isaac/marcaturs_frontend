import { Link } from 'react-router-dom'
import { EmailVerificationActions } from '@/features/participant-settings/EmailVerificationActions'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

/**
 * Shown when the user is authenticated (or restricted) but has not verified email.
 * Distinct from participant Verification checklist (/verification).
 */
export function EmailVerificationRequiredPage() {
  const { user, logout, refresh } = useAuth()

  return (
    <>
      <PageMeta
        title="Verify your email"
        description="Confirm your email address before using MarcatursHub."
      />
      <div className="auth-panel reveal">
        <p className="eyebrow">Account security</p>
        <h1>Verify your email to continue</h1>
        <p className="auth-panel__lead">
          We sent a verification link to <strong>{user?.email}</strong>. Open that link, then return
          here. 
        </p>
        <EmailVerificationActions />
        <div className="row" style={{ marginTop: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            I have verified — refresh
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void logout()
            }}
          >
            Sign out
          </Button>
        </div>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
          Need help? See the <Link to="/faq">FAQ</Link> or <Link to="/contact">Contact</Link>.
        </p>
      </div>
    </>
  )
}
