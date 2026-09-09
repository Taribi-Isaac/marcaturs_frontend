import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'

const businessLinks = [
  { to: '/app/business', end: true, label: 'Dashboard' },
  { to: '/app/business/campaigns', label: 'Campaigns' },
  { to: '/app/business/deals', label: 'Deals' },
  { to: '/app/business/messages', label: 'Messages' },
  { to: '/app/business/commissions', label: 'Commissions' },
  { to: '/app/business/disputes', label: 'Disputes' },
  { to: '/app/business/notifications', label: 'Notifications' },
  { to: '/app/business/verification', label: 'Verification' },
  { to: '/app/business/settings', label: 'Settings' },
]

export function BusinessShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <aside className="app-shell__nav" aria-label="Business navigation">
        <div className="brand" style={{ color: '#fff', marginBottom: '1.5rem' }}>
          <span className="brand__mark">M</span>
          Business
        </div>
        <nav>
          {businessLinks.map((link) => (
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
