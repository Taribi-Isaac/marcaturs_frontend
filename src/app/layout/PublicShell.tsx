import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { companySocialLinks } from '@/app/config/socialLinks'
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

  const authActions =
    authenticated && user ? (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            void logout()
          }}
        >
          Sign out
        </Button>
        <Link
          className="btn btn--primary btn--sm"
          to={user.role === 'BUSINESS' ? '/app/business' : '/app/ambassador'}
          onClick={() => setOpen(false)}
        >
          Open app
        </Link>
      </>
    ) : (
      <>
        <Link className="btn btn--ghost btn--sm" to="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link className="btn btn--primary btn--sm" to="/register" onClick={() => setOpen(false)}>
          Get started
        </Link>
      </>
    )

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
          <nav className="site-header__nav" aria-label="Primary">
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
            <div className="nav-actions__auth">{authActions}</div>
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="visually-hidden">Menu</span>
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
        <div id="mobile-nav" className={`mobile-drawer${open ? ' is-open' : ''}`}>
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <div className="mobile-drawer__actions">{authActions}</div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div>
            <div className="brand site-footer__brand">
              <span className="brand__mark">M</span>
              MarcatursHub
            </div>
            <p className="site-footer__intro">
              More reach for businesses. More opportunities for independent ambassadors. Customers
              pay businesses directly. MarcatursHub coordinates the commercial record, not the
              money.
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
          <div>
            <h3>Follow</h3>
            <ul className="site-footer__social">
              {companySocialLinks.map((network) => (
                <li key={network.id}>
                  {network.href ? (
                    <a
                      href={network.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${network.label} (opens in a new tab)`}
                    >
                      {network.label}
                    </a>
                  ) : (
                    <span
                      className="site-footer__social-pending"
                      aria-label={`${network.label} (link destination awaiting confirmation)`}
                    >
                      {network.label}
                    </span>
                  )}
                </li>
              ))}
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
