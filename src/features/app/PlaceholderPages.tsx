import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'

export function ForbiddenPage() {
  const { logout, user } = useAuth()
  return (
    <>
      <PageMeta title="Access unavailable" />
      <div className="auth-panel">
        <h1>This app is for marketplace participants</h1>
        <p className="auth-panel__lead">
          {user?.role === 'ADMIN'
            ? 'Admin accounts use the Admin Control application, not this participant workspace.'
            : 'You are signed in, but this area is not available for your account. This is not a login failure.'}
        </p>
        <div className="row">
          <Button onClick={() => void logout()}>Sign out</Button>
          <Link to="/">Back home</Link>
        </div>
      </div>
    </>
  )
}

export function AccountBlockedPage() {
  const { logout, user } = useAuth()
  return (
    <>
      <PageMeta title="Account restricted" />
      <div className="auth-panel">
        <h1>Account access limited</h1>
        <p className="auth-panel__lead">
          Your account status is <strong>{user?.status}</strong>. Marketplace actions are
          unavailable until access is restored.
        </p>
        <Button onClick={() => void logout()}>Sign out</Button>
      </div>
    </>
  )
}

export function NotFoundPage() {
  return (
    <>
      <PageMeta title="Not found" />
      <div className="auth-panel">
        <h1>Page not found</h1>
        <p className="auth-panel__lead">That route does not exist.</p>
        <Link to="/">Go home</Link>
      </div>
    </>
  )
}

export function PlaceholderDesk({ title, description }: { title: string; description: string }) {
  return (
    <div className="placeholder-desk">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{title}</h1>
      <p style={{ color: 'var(--color-muted)', maxWidth: '36rem' }}>{description}</p>
    </div>
  )
}
