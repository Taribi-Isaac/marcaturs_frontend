import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'
import { useAuth } from './authContext'

export function SessionErrorPage() {
  const { refresh, logout } = useAuth()

  return (
    <>
      <PageMeta title="Session check" />
      <div className="auth-panel">
        <h1>We could not confirm your session</h1>
        <p className="auth-panel__lead">
          This is a temporary connection problem, not a permission error. Try again without signing
          out.
        </p>
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button type="button" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button type="button" variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
