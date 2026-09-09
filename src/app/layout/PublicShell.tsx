import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { Button } from '@/shared/ui/Button'

const publicLinks = [
  { to: '/discover', label: 'Discover' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/for-businesses', label: 'For businesses' },
  { to: '/for-ambassadors', label: 'For ambassadors' },
]

export function PublicShell() {
  const { status, user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const authenticated = status === 'authenticated' || status === 'restricted'

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="MarcatursHub home">
            <span className="brand__mark" aria-hidden>
              M
            </span>
            MarcatursHub
          </Link>
          <nav aria-label="Primary">
            <ul className="nav-links">
              {publicLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} onClick={() => setOpen(false)}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-actions">
            {authenticated && user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Sign out
                </Button>
                <Link
                  className="btn btn--primary btn--sm"
                  to={user.role === 'BUSINESS' ? '/app/business' : '/app/ambassador'}
                >
                  Open app
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn--ghost btn--sm" to="/login">
                  Sign in
                </Link>
                <Link className="btn btn--primary btn--sm" to="/register">
                  Get started
                </Link>
              </>
            )}
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="visually-hidden">Menu</span>☰
            </button>
          </div>
        </div>
        <div id="mobile-nav" className={`mobile-drawer${open ? ' is-open' : ''}`}>
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div>
            <div className="brand" style={{ color: '#fff', marginBottom: '1rem' }}>
              <span className="brand__mark">M</span>
              MarcatursHub
            </div>
            <p style={{ maxWidth: '28rem', color: '#9eb0a8' }}>
              A marketplace where businesses publish commission opportunities and independent
              ambassadors promote them. Customers pay businesses directly.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <Link to="/discover">Discover</Link>
              </li>
              <li>
                <Link to="/how-it-works">How it works</Link>
              </li>
              <li>
                <Link to="/faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Participate</h3>
            <ul>
              <li>
                <Link to="/for-businesses">For businesses</Link>
              </li>
              <li>
                <Link to="/for-ambassadors">For ambassadors</Link>
              </li>
              <li>
                <Link to="/register">Create account</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Company</h3>
            <ul>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/terms">Terms</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container site-footer__meta">
          © {new Date().getFullYear()} MarcatursHub. Marketplace coordination — not a payment
          wallet.
        </div>
      </footer>
    </>
  )
}
