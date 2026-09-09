import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'

const ambassadorLinks = [
  { to: '/app/ambassador', end: true, label: 'Discover' },
  { to: '/app/ambassador/deals', label: 'Deals' },
  { to: '/app/ambassador/earnings', label: 'Earnings' },
  { to: '/app/ambassador/messages', label: 'Messages' },
  { to: '/app/ambassador/verification', label: 'Verification' },
  { to: '/app/ambassador/notifications', label: 'Notifications' },
  { to: '/app/ambassador/settings', label: 'Settings' },
]

export function AmbassadorShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <aside className="app-shell__nav" aria-label="Ambassador navigation">
        <div className="brand" style={{ color: '#fff', marginBottom: '1.5rem' }}>
          <span className="brand__mark">M</span>
          Ambassador
        </div>
        <nav>
          {ambassadorLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-shell__main">
        <div className="app-shell__top">
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: 4 }}>
              Signed in as
            </p>
            <strong>{user?.name}</strong>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }))
            }}
          >
            Sign out
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
